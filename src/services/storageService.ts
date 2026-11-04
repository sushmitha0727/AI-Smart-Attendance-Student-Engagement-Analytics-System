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

import { compressPhoto, saveStudentPhoto } from './photoService';

/**
 * Upload a student profile / face photo using Firestore photoService
 */
export async function uploadProfileImage(
  studentId: string,
  file: File | Blob
): Promise<string> {
  try {
    const dataUrl = await compressPhoto(file);
    await saveStudentPhoto(studentId, dataUrl, true);
    return dataUrl;
  } catch (error: any) {
    console.error('Photo save error in uploadProfileImage:', error);
    throw error;
  }
}

/**
 * Uploads student face photo via photoService (Firestore)
 */
export async function uploadStudentPhotoResumable(
  file: File | Blob,
  onStatusOrProgress?: (status: string | number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!auth.currentUser) {
    throw new Error('You are not signed in with Firebase. Please log out and sign in again.');
  }

  const uid = auth.currentUser.uid;
  if (onStatusOrProgress) onStatusOrProgress('Compressing...');
  
  const dataUrl = await compressPhoto(file);
  
  if (onStatusOrProgress) onStatusOrProgress('Saving...');
  await saveStudentPhoto(uid, dataUrl, true);

  if (onStatusOrProgress) onStatusOrProgress('Saved');
  return { downloadUrl: dataUrl, storagePath: `studentPhotos/${uid}` };
}

