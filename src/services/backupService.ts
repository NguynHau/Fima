import JSZip from 'jszip';
import { db, getUserSettings } from '../db/database';
import { type Transaction, type TransactionImage, type UserSettings, type PhotoQuality } from '../types';

export interface BackupImageMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size?: number;
  quality?: PhotoQuality;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  settings: UserSettings;
  transactions: Transaction[];
  imagesCount?: number;
  images?: BackupImageMeta[];
}

/**
 * Helper to convert any image blob/data into ArrayBuffer
 */
async function toArrayBuffer(data: unknown): Promise<ArrayBuffer | null> {
  if (!data) return null;
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    return (data.buffer as ArrayBuffer).slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (data instanceof Blob) {
    return await data.arrayBuffer();
  }
  if (typeof data === 'string') {
    const b64 = data.includes(',') ? data.split(',')[1] : data;
    try {
      const binary = atob(b64);
      const u8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        u8[i] = binary.charCodeAt(i);
      }
      return u8.buffer;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Exports all database records and images into a downloadable zip file
 */
export async function exportBackupZip(): Promise<Blob> {
  const [settings, transactions, dbImages] = await Promise.all([
    getUserSettings(),
    db.transactions.toArray(),
    db.images.toArray(),
  ]);

  // Index images from db.images
  const imageMap = new Map<string, TransactionImage>();
  for (const img of dbImages) {
    if (img && img.id) {
      imageMap.set(img.id, img);
      const cleanId = img.id.replace(/\.[^/.]+$/, '');
      imageMap.set(cleanId, img);
    }
  }

  // Cross-check all transactions to ensure no referenced image is missed
  for (const t of transactions) {
    if (t.imageId && !imageMap.has(t.imageId)) {
      const cleanId = t.imageId.replace(/\.[^/.]+$/, '');
      const direct = (await db.images.get(t.imageId)) || (await db.images.get(cleanId));
      if (direct) {
        imageMap.set(t.imageId, direct);
        imageMap.set(cleanId, direct);
      }
    }
  }

  const zip = new JSZip();
  const photosFolder = zip.folder('photos');
  const imageMetadataList: BackupImageMeta[] = [];
  const processedExportIds = new Set<string>();

  for (const [id, img] of imageMap.entries()) {
    const cleanId = id.replace(/\.[^/.]+$/, '');
    if (processedExportIds.has(cleanId)) continue;
    processedExportIds.add(cleanId);

    if (!img || !img.blob) continue;

    const buffer = await toArrayBuffer(img.blob);
    if (!buffer || buffer.byteLength === 0) continue;

    const mimeType = img.mimeType || 'image/jpeg';
    const ext = mimeType.toLowerCase().includes('png') ? 'png' : 'jpg';
    const fileName = `${cleanId}.${ext}`;

    if (photosFolder) {
      photosFolder.file(fileName, buffer);
    } else {
      zip.file(`photos/${fileName}`, buffer);
    }

    imageMetadataList.push({
      id: cleanId,
      fileName,
      mimeType,
      size: buffer.byteLength,
      quality: img.quality || 'low',
    });
  }

  const backupData: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings,
    transactions,
    imagesCount: imageMetadataList.length,
    images: imageMetadataList,
  };

  // Add data.json
  zip.file('data.json', JSON.stringify(backupData, null, 2));

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

  // Locate data.json in root or any sub-directory
  let dataJsonFile = loadedZip.file('data.json');
  if (!dataJsonFile) {
    for (const [path, entry] of Object.entries(loadedZip.files)) {
      if (!entry.dir && (path.endsWith('/data.json') || path.endsWith('\\data.json'))) {
        dataJsonFile = entry;
        break;
      }
    }
  }

  if (!dataJsonFile) {
    throw new Error('File backup không hợp lệ: thiếu file data.json');
  }

  const jsonContent = await dataJsonFile.async('string');
  const backupData = JSON.parse(jsonContent) as BackupData;

  if (!backupData.transactions || !Array.isArray(backupData.transactions)) {
    throw new Error('Dữ liệu giao dịch trong backup không đúng định dạng');
  }

  // 1. Scan and extract all images from the zip archive
  const imagesFromZip = new Map<string, { buffer: ArrayBuffer; mimeType: string }>();

  for (const [rawPath, zipEntry] of Object.entries(loadedZip.files)) {
    if (zipEntry.dir) continue;

    const normalizedPath = rawPath.replace(/\\/g, '/');
    if (normalizedPath === 'data.json' || normalizedPath.endsWith('/data.json')) {
      continue;
    }

    const fileName = normalizedPath.split('/').pop() || '';
    if (!fileName) continue;

    const isInsidePhotosFolder =
      normalizedPath.startsWith('photos/') ||
      normalizedPath.includes('/photos/') ||
      normalizedPath.startsWith('images/') ||
      normalizedPath.includes('/images/');

    const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|bmp|heic|svg)$/i.test(fileName);
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const isReferencedByTx = backupData.transactions.some(
      (t) => t.imageId === nameWithoutExt || t.imageId === fileName
    );

    if (isInsidePhotosFolder || hasImageExtension || isReferencedByTx) {
      try {
        const buffer = await zipEntry.async('arraybuffer');
        if (buffer && buffer.byteLength > 0) {
          let mimeType = 'image/jpeg';
          if (/\.png$/i.test(fileName)) mimeType = 'image/png';
          else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
          else if (/\.gif$/i.test(fileName)) mimeType = 'image/gif';
          else if (/\.svg$/i.test(fileName)) mimeType = 'image/svg+xml';

          imagesFromZip.set(nameWithoutExt, { buffer, mimeType });
          imagesFromZip.set(fileName, { buffer, mimeType });
        }
      } catch (err) {
        console.error(`Lỗi đọc ảnh từ file ${rawPath}:`, err);
      }
    }
  }

  let importedImagesCount = 0;

  await db.transaction('rw', db.transactions, db.images, db.settings, async () => {
    // 1. Restore Settings (merge with existing settings)
    if (backupData.settings) {
      const current = await getUserSettings();
      await db.settings.put({
        ...current,
        ...backupData.settings,
        id: current.id || 'default_user_settings',
        nickname: backupData.settings.nickname || current.nickname,
        avatarDataUrl: backupData.settings.avatarDataUrl || current.avatarDataUrl,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Restore Photos into db.images (preserving any other existing images)
    const savedCleanIds = new Set<string>();
    for (const [key, item] of imagesFromZip.entries()) {
      const cleanId = key.replace(/\.[^/.]+$/, '');
      if (savedCleanIds.has(cleanId)) continue;
      savedCleanIds.add(cleanId);

      const blob = new Blob([item.buffer], { type: item.mimeType });
      const now = new Date().toISOString();
      const meta = backupData.images?.find((m) => m.id === cleanId || m.fileName === key);

      await db.images.put({
        id: cleanId,
        blob,
        mimeType: item.mimeType,
        createdAt: now,
        quality: meta?.quality || 'low',
      });

      importedImagesCount++;
    }

    // 3. Restore Transactions (preserving any other existing transactions)
    for (const t of backupData.transactions) {
      let imageId = t.imageId;
      if (imageId) {
        const cleanImageId = imageId.replace(/\.[^/.]+$/, '');
        if (savedCleanIds.has(cleanImageId) || imagesFromZip.has(cleanImageId) || imagesFromZip.has(imageId)) {
          imageId = cleanImageId;
        }
      }

      await db.transactions.put({
        id: t.id || crypto.randomUUID(),
        date: t.date,
        type: t.type,
        amount: Math.abs(t.amount),
        category: t.category,
        note: t.note || '',
        account: t.account,
        imageId,
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
