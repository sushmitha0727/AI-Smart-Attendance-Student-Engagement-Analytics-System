import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compressPhoto, saveStudentPhoto, getStudentPhoto } from './photoService.js';

describe('photoService unit tests', () => {
  it('rejects compression when file is undefined or null', async () => {
    await assert.rejects(
      async () => {
        await compressPhoto(null as any);
      },
      {
        message: 'No file provided for compression.',
      }
    );
  });

  it('rejects compression when file is not an image type', async () => {
    const textBlob = new Blob(['sample non-image text'], { type: 'text/plain' });
    await assert.rejects(
      async () => {
        await compressPhoto(textBlob);
      },
      {
        message: 'Selected file is not an image. Please select a valid JPEG or PNG photo.',
      }
    );
  });

  it('rejects saveStudentPhoto when uid is empty', async () => {
    await assert.rejects(
      async () => {
        await saveStudentPhoto('', 'data:image/jpeg;base64,123');
      },
      {
        message: 'User ID is required to save student photo.',
      }
    );
  });

  it('rejects saveStudentPhoto when dataUrl is not an image data URL', async () => {
    await assert.rejects(
      async () => {
        await saveStudentPhoto('test-uid', 'https://example.com/fake.jpg');
      },
      {
        message: 'Invalid image data URL provided.',
      }
    );
  });

  it('getStudentPhoto returns null when uid is empty', async () => {
    const result = await getStudentPhoto('');
    assert.equal(result, null);
  });
});
