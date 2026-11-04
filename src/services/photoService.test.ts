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

  it('getStudentPhoto returns null immediately for faculty accounts like fac302', async () => {
    const resultFaculty1 = await getStudentPhoto('fac302');
    const resultFaculty2 = await getStudentPhoto('fac-ramesh');
    const resultFaculty3 = await getStudentPhoto('FAC_JOHN');
    assert.equal(resultFaculty1, null);
    assert.equal(resultFaculty2, null);
    assert.equal(resultFaculty3, null);
  });

  it('getStudentPhoto returns null immediately for admin accounts', async () => {
    const resultAdmin1 = await getStudentPhoto('user-admin');
    const resultAdmin2 = await getStudentPhoto('admin');
    assert.equal(resultAdmin1, null);
    assert.equal(resultAdmin2, null);
  });

  it('saveStudentPhoto safely ignores faculty or admin accounts without error', async () => {
    // Should not throw or write to studentPhotos
    await saveStudentPhoto('fac302', 'data:image/jpeg;base64,123');
    await saveStudentPhoto('admin', 'data:image/jpeg;base64,123');
  });
});
