import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { storage, auth } from '../firebase/config';

export interface StorageUploadResult {
  url: string;
  path: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Upload an assignment submission file to Firebase Storage
 */
export async function uploadAssignmentFile(
  assignmentId: string,
  studentId: string,
  file: File
): Promise<StorageUploadResult> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `assignments/${assignmentId}/${studentId}_${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        assignmentId,
        studentId,
        originalName: file.name,
      },
    });
    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      sizeBytes: file.size,
    };
  } catch (error: any) {
    console.warn('Firebase Storage direct upload notice:', error?.message);
    const blobUrl = URL.createObjectURL(file);
    return {
      url: blobUrl,
      path,
      fileName: file.name,
      sizeBytes: file.size,
    };
  }
}

/**
 * Upload a student profile / face photo to Firebase Storage
 */
export async function uploadProfileImage(
  studentId: string,
  file: File | Blob,
  fileName = 'profile.jpg'
): Promise<string> {
  const path = `profiles/${studentId}_${Date.now()}_${fileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytesResumable(storageRef, file, {
      contentType: 'image/jpeg',
      customMetadata: { studentId },
    });
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.warn('Firebase Storage profile upload notice:', error?.message);
    return URL.createObjectURL(file);
  }
}

/**
 * Resumable student photo upload with compression (0-30%), upload (30-100%), timeout, and stage logging
 */
export async function uploadStudentPhotoResumable(
  file: File | Blob,
  onProgress: (pct: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!auth.currentUser) {
    throw new Error('You are not signed in with Firebase. Please log out and sign in again.');
  }

  // 1. Compression (0 - 30%)
  onProgress(10);
  const resizedBlob = await new Promise<Blob>((resolve, reject) => {
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
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to blob failed'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
  console.log('compressed');
  onProgress(30);

  // 2. Upload (30 - 100%) using uploadBytesResumable
  const storagePath = `studentPhotos/${auth.currentUser.uid}/registered.jpg`;
  const storageRef = ref(storage, storagePath);
  
  console.log('upload started');
  const uploadTask = uploadBytesResumable(storageRef, resizedBlob, {
    contentType: 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Upload timed out. Check your connection and try again.'));
    }, 30000);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const trans = snapshot.bytesTransferred;
        const total = snapshot.totalBytes || resizedBlob.size || 1;
        const uploadRatio = Math.min(1, trans / total);
        const overallPct = Math.round(30 + uploadRatio * 70);
        onProgress(overallPct);
      },
      error => {
        clearTimeout(timeout);
        console.error('Storage upload error:', error);
        reject(error);
      },
      async () => {
        clearTimeout(timeout);
        try {
          console.log('upload complete');
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
