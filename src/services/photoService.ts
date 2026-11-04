import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface StudentPhotoData {
  dataUrl: string;
  updatedAt: string;
  consentGiven: boolean;
}

/**
 * Compresses an image file:
 * - Rejects non-image files
 * - Resizes using a canvas to max 320px on the longest side
 * - Exports as JPEG with quality 0.8
 * - If result is over 150 KB, lowers quality in steps until under 150 KB
 */
export async function compressPhoto(file: File | Blob): Promise<string> {
  if (!file) {
    throw new Error('No file provided for compression.');
  }

  // Check file type
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image. Please select a valid JPEG or PNG photo.');
  }

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width <= 0 || height <= 0) {
          reject(new Error('Invalid image dimensions.'));
          return;
        }

        // Maintain aspect ratio, max 320px on the longest side
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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to create canvas 2D rendering context.'));
          return;
        }

        // Fill background with white in case of transparent PNGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const MAX_BYTES = 150 * 1024; // 150 KB

        // Helper to estimate byte size from base64 data URL
        const getByteLength = (url: string) => {
          const base64 = url.split(',')[1] || '';
          return Math.round((base64.length * 3) / 4);
        };

        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Lower quality in steps of 0.1 until result is under 150 KB
        while (getByteLength(dataUrl) > MAX_BYTES && quality > 0.15) {
          quality = Number((quality - 0.1).toFixed(2));
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Saves a compressed student photo to Firestore at studentPhotos/{uid}
 * and records hasRegisteredPhoto: true and registeredAt in users/{uid}.
 * Does NOT place raw photo data in users/{uid} or localStorage.
 */
export async function saveStudentPhoto(
  uid: string,
  dataUrl: string,
  consentGiven = true
): Promise<void> {
  if (!uid) {
    throw new Error('User ID is required to save student photo.');
  }
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image data URL provided.');
  }

  try {
    const updatedAt = new Date().toISOString();

    // 1. Write exclusively to studentPhotos/{uid}
    const photoDocRef = doc(db, 'studentPhotos', uid);
    await setDoc(photoDocRef, {
      dataUrl,
      updatedAt,
      consentGiven,
    });

    // 2. Update users/{uid} with metadata only (NO image data)
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      hasRegisteredPhoto: true,
      registeredAt: updatedAt,
    }).catch(err => {
      // If user document does not exist yet or update fails, log notice
      console.warn('Notice updating users document metadata for photo status:', err?.message);
    });
  } catch (error) {
    console.error(`Failed to save student photo in Firestore for student ${uid}:`, error);
    throw error;
  }
}

/**
 * Reads the student photo from Firestore document studentPhotos/{uid}.
 * Returns the dataUrl string or null if not found.
 */
export async function getStudentPhoto(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    const photoDocRef = doc(db, 'studentPhotos', uid);
    const snap = await getDoc(photoDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.dataUrl as string) || null;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch student photo from Firestore for student ${uid}:`, error);
    return null;
  }
}
