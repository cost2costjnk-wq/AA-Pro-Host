
import { db } from './db';
import { getDirectoryHandle, verifyPermission } from './backupStorage';
import { compressionService } from './compressionService';

class AutoBackupService {
  private intervalId: number | null = null;
  private lastSyncMinute: string | null = null;

  start() {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => this.checkSchedule(), 60000);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private async checkSchedule() {
    const config = db.getCloudConfig();
    if (!config.autoBackup || !config.backupSchedules?.length) return;
    
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (this.lastSyncMinute === current) return;
    
    if (config.backupSchedules.includes(current)) {
      this.lastSyncMinute = current;
      await this.performLocalBackup();
      db.updateCloudConfig({ ...config, lastBackup: new Date().toISOString() });
    }
  }

  async performLocalBackup(): Promise<boolean> {
    try {
      const handle = await getDirectoryHandle();
      if (!handle) return false;
      const hasPerm = await verifyPermission(handle, true);
      if (!hasPerm) return false;

      const profile = db.getBusinessProfile();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const data = JSON.stringify(db.getBackupData());
      
      const config = db.getCloudConfig();
      const cleanName = profile.name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

      if (config.compressionEnabled) {
          const fileName = `AAPro_Local_${cleanName}_${ts}.json.gz`;
          const compressed = await compressionService.compress(data);
          const fileHandle = await handle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(compressed);
          await writable.close();
      } else {
          const fileName = `AAPro_Local_${cleanName}_${ts}.json`;
          const fileHandle = await handle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
      }
      return true;
    } catch (error) {
      console.error("Local Path backup engine error:", error);
      return false;
    }
  }

  /**
   * Scans the configured local directory for the absolute LATEST 
   * snapshot matching the specified company name.
   */
  async getLatestBackupForCompany(companyName: string): Promise<any | null> {
      try {
          const handle = await getDirectoryHandle();
          if (!handle) return null;
          const hasPerm = await verifyPermission(handle, false);
          if (!hasPerm) return null;

          const searchPattern = companyName.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').toLowerCase();
          let latestFile: any = null;
          let latestTimestamp = 0;

          // Iterating through file handles in the directory
          // @ts-ignore
          for await (const entry of handle.values()) {
              if (entry.kind === 'file' && entry.name.includes('AAPro_Local') && entry.name.toLowerCase().includes(searchPattern)) {
                  const fileHandle = entry as FileSystemFileHandle;
                  const file = await fileHandle.getFile();
                  const modDate = file.lastModified;
                  
                  if (modDate > latestTimestamp) {
                      latestTimestamp = modDate;
                      latestFile = {
                          handle: fileHandle,
                          date: new Date(modDate),
                          name: entry.name
                      };
                  }
              }
          }
          return latestFile;
      } catch (e) {
          console.error("Error scanning for latest snapshot:", e);
          return null;
      }
  }
}

export const autoBackupService = new AutoBackupService();
