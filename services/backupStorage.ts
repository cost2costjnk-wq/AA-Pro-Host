
import { openDB } from 'idb';

const DB_NAME = 'aapro_config';
const STORE_NAME = 'handles';

const initStorage = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle) => {
  try {
    const db = await initStorage();
    await db.put(STORE_NAME, handle, 'backup_dir');
    return true;
  } catch (error) {
    console.error("Failed to save directory handle", error);
    return false;
  }
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await initStorage();
    return await db.get(STORE_NAME, 'backup_dir');
  } catch (error) {
    console.error("Failed to get directory handle", error);
    return null;
  }
};

export const verifyPermission = async (handle: FileSystemDirectoryHandle, readWrite = false) => {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  // Fix: queryPermission and requestPermission are part of the File System Access API. 
  // Cast handle to any to bypass TypeScript's missing property errors on standard handle types.
  if ((await (handle as any).queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await (handle as any).requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
};
