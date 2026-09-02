import JSZip from 'jszip';
import { db, getUserSettings } from '../db/database';
import { type Transaction, type UserSettings } from '../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  settings: UserSettings;
  transactions: Transaction[];
}

/**
 * Exports all database records and images into a downloadable zip file
 */
export async function exportBackupZip(): Promise<Blob> {
  const [settings, transactions, images] = await Promise.all([
    getUserSettings(),
    db.transactions.toArray(),
    db.images.toArray(),
  ]);

  const backupData: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    transactions,
  };

  const zip = new JSZip();

  // Add data.json
  zip.file('data.json', JSON.stringify(backupData, null, 2));

  // Add photos folder
  const photosFolder = zip.folder('photos');
  if (photosFolder) {
    for (const img of images) {
      if (img.blob) {
        photosFolder.file(`${img.id}.jpg`, img.blob);
      }
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipBlob;
}

/**
 * Imports and restores all database records and images from a backup zip file
 */
export async function importBackupZip(file: File): Promise<{
  importedTransactionsCount: number;
  importedImagesCount: number;
}> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const dataJsonFile = loadedZip.file('data.json');
  if (!dataJsonFile) {
    throw new Error('File backup không hợp lệ: thiếu file data.json');
  }

  const jsonContent = await dataJsonFile.async('string');
  const backupData = JSON.parse(jsonContent) as BackupData;

  if (!backupData.transactions || !Array.isArray(backupData.transactions)) {
    throw new Error('Dữ liệu giao dịch trong backup không đúng định dạng');
  }

  const photosFolder = loadedZip.folder('photos');
  let importedImagesCount = 0;

  await db.transaction('rw', db.transactions, db.images, db.settings, async () => {
    // Restore Settings
    if (backupData.settings) {
      await db.settings.put(backupData.settings);
    }

    // Restore Photos
    if (photosFolder) {
      const photoFiles = Object.keys(photosFolder.files).filter(
        (filename) => !photosFolder.files[filename].dir
      );

      for (const filepath of photoFiles) {
        const fileObj = photosFolder.file(filepath);
        if (fileObj) {
          const blob = await fileObj.async('blob');
          const cleanId = filepath.replace(/^photos\//, '').replace(/\.jpg$/i, '').replace(/\.jpeg$/i, '').replace(/\.png$/i, '');
          if (cleanId) {
            await db.images.put({
              id: cleanId,
              blob,
              mimeType: 'image/jpeg',
              createdAt: new Date().toISOString(),
            });
            importedImagesCount++;
          }
        }
      }
    }

    // Restore Transactions
    for (const t of backupData.transactions) {
      await db.transactions.put({
        id: t.id || crypto.randomUUID(),
        date: t.date,
        type: t.type,
        amount: Math.abs(t.amount),
        category: t.category,
        note: t.note || '',
        account: t.account,
        imageId: t.imageId,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString(),
      });
    }
  });

  return {
    importedTransactionsCount: backupData.transactions.length,
    importedImagesCount,
  };
}

/**
 * Helper to trigger browser download for a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
