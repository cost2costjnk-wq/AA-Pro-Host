
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

export const saveDirectoryHandle = async (handle: any) => {
  try {
    const db = await initStorage();
    await db.put(STORE_NAME, handle, 'backup_dir');
    return true;
  } catch (error) {
    console.error("Failed to save directory handle", error);
    return false;
  }
};

export const getDirectoryHandle = async () => {
  try {
    const db = await initStorage();
    return await db.get(STORE_NAME, 'backup_dir');
  } catch (error) {
    console.error("Failed to get directory handle", error);
    return null;
  }
};
