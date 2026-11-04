import * as faceapi from '@vladmandic/face-api';
import { storage, db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { compressPhoto, saveStudentPhoto } from '../services/photoService';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Loads @vladmandic/face-api models from jsDelivr CDN
 */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  loadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (err: any) {
      console.error('Failed to load face-api models:', err);
      loadingPromise = null;
      throw new Error(
        'Failed to load face verification models. Please check your network connection or HTTPS status.'
      );
    }
  })();

  return loadingPromise;
}

/**
 * Validates photo quality for registration: exactly one face, reasonably sized/centered, not too dark.
 */
export async function validateRegistrationPhoto(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<{ valid: boolean; message?: string }> {
  await loadFaceApiModels();

  const detections = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks();

  if (!detections) {
    return { valid: false, message: 'No face detected. Please ensure your face is clearly visible and well-lit.' };
  }

  const allDetections = await faceapi.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }));
  if (allDetections.length === 0) {
    return { valid: false, message: 'No face detected.' };
  }
  if (allDetections.length > 1) {
    return { valid: false, message: 'Multiple faces detected. Please ensure only your face is in the frame.' };
  }

  const box = detections.detection.box;
  const imageWidth = (input as any).width || (input as any).videoWidth || 640;
  const imageHeight = (input as any).height || (input as any).videoHeight || 480;

  if (box.width < imageWidth * 0.15 || box.height < imageHeight * 0.15) {
    return { valid: false, message: 'Face is too far away. Please move closer to the camera.' };
  }

  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  if (
    Math.abs(faceCenterX - imageWidth / 2) > imageWidth * 0.35 ||
    Math.abs(faceCenterY - imageHeight / 2) > imageHeight * 0.35
  ) {
    return { valid: false, message: 'Face is not centered. Please center your face in the frame.' };
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(input, 0, 0, 100, 100);
      const imgData = ctx.getImageData(0, 0, 100, 100);
      let totalBrightness = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];
        totalBrightness += (r * 0.299 + g * 0.587 + b * 0.114);
      }
      const avgBrightness = totalBrightness / (100 * 100);
      if (avgBrightness < 40) {
        return { valid: false, message: 'Image is too dark. Please ensure adequate lighting.' };
      }
    }
  } catch (e) {
    // Ignore canvas read error
  }

  return { valid: true };
}

/**
 * Resizes an image to max 640px JPEG blob with quality ~0.8
 */
export async function resizeImageToJpeg(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 640;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = err => reject(err);
    img.src = url;
  });
}

/**
 * Saves image using Firestore photoService instead of Cloud Storage
 */
export async function uploadImageResumable(
  storagePath: string,
  blob: Blob,
  onStatusOrProgress?: (status: any) => void
): Promise<string> {
  const parts = storagePath.split('/');
  const uid = parts[1] || parts[0];
  console.log(`[Photo Upload] Step 3: Firestore photo save started for uid: ${uid}`);

  if (onStatusOrProgress) onStatusOrProgress('Compressing...');
  try {
    const dataUrl = await compressPhoto(blob);
    if (onStatusOrProgress) onStatusOrProgress('Saving...');
    await saveStudentPhoto(uid, dataUrl, true);
    if (onStatusOrProgress) onStatusOrProgress('Saved');
    console.log(`[Photo Upload] Step 3: Photo saved to Firestore for uid ${uid}`);
    return dataUrl;
  } catch (error: any) {
    console.error('[Photo Upload] Step 3 Photo save error:', error);
    throw error;
  }
}

/**
 * Validates registration photo with a 20-second timeout and step logging
 */
export async function validateRegistrationPhotoWithTimeout(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{ valid: boolean; message?: string }> {
  console.log('[Photo Upload] Step 2: Face validation started at', new Date().toISOString());
  const startTime = Date.now();
  const timeoutPromise = new Promise<{ valid: boolean; message: string }>((_, reject) =>
    setTimeout(() => reject(new Error('Face validation timed out after 20 seconds.')), 20000)
  );
  try {
    const res = await Promise.race([validateRegistrationPhoto(input), timeoutPromise]);
    console.log(`[Photo Upload] Step 2: Face validation completed in ${Date.now() - startTime}ms`);
    return res;
  } catch (err: any) {
    console.error('[Photo Upload] Step 2 Face validation error/timeout:', err);
    throw err;
  }
}

/**
 * Computes 128-d face descriptor from image/video element
 */
export async function computeFaceDescriptor(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<Float32Array | null> {
  await loadFaceApiModels();
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? detection.descriptor : null;
}

/**
 * Calculates Eye Aspect Ratio (EAR) for blink detection
 */
export function calculateEAR(eyePoints: faceapi.Point[]): number {
  if (!eyePoints || eyePoints.length < 6) return 0.3;
  const v1 = Math.hypot(eyePoints[1].x - eyePoints[5].x, eyePoints[1].y - eyePoints[5].y);
  const v2 = Math.hypot(eyePoints[2].x - eyePoints[4].x, eyePoints[2].y - eyePoints[4].y);
  const h = Math.hypot(eyePoints[0].x - eyePoints[3].x, eyePoints[0].y - eyePoints[3].y);
  return (v1 + v2) / (2.0 * (h || 1));
}

/**
 * Computes head turn metric from nose and jaw landmarks
 */
export function calculateHeadTurn(landmarks: faceapi.FaceLandmarks68): 'left' | 'right' | 'center' {
  const nose = landmarks.getNose();
  const jaw = landmarks.getJawOutline();
  const noseTip = nose[3];
  const leftJaw = jaw[0];
  const rightJaw = jaw[16];

  const leftDist = Math.abs(noseTip.x - leftJaw.x);
  const rightDist = Math.abs(noseTip.x - rightJaw.x);
  const ratio = leftDist / (rightDist || 1);

  if (ratio > 1.35) return 'left';
  if (ratio < 0.75) return 'right';
  return 'center';
}

/**
 * Computes head nod metric from vertical nose position relative to eyes and chin
 */
export function calculateNod(landmarks: faceapi.FaceLandmarks68): boolean {
  const nose = landmarks.getNose();
  const jaw = landmarks.getJawOutline();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const eyeCenterY = (leftEye[0].y + rightEye[3].y) / 2;
  const noseTipY = nose[3].y;
  const chinY = jaw[8].y;
  const faceHeight = chinY - eyeCenterY;
  const noseRelativePos = (noseTipY - eyeCenterY) / (faceHeight || 1);
  return noseRelativePos < 0.40 || noseRelativePos > 0.50;
}

/**
 * Calculates Mouth Aspect Ratio (MAR) for open mouth detection
 */
export function calculateMAR(mouthPoints: faceapi.Point[]): number {
  if (!mouthPoints || mouthPoints.length < 20) return 0.2;
  const v1 = Math.hypot(mouthPoints[2].x - mouthPoints[10].x, mouthPoints[2].y - mouthPoints[10].y);
  const v2 = Math.hypot(mouthPoints[4].x - mouthPoints[8].x, mouthPoints[4].y - mouthPoints[8].y);
  const h = Math.hypot(mouthPoints[0].x - mouthPoints[6].x, mouthPoints[0].y - mouthPoints[6].y);
  return (v1 + v2) / (2.0 * (h || 1));
}
