
import { db } from './db';
import { getDirectoryHandle, verifyPermission } from './backupStorage';

class AutoBackupService {
  private intervalId: number | null = null;
  private lastSyncMinute: string | null = null;

  start() {
    if (this.intervalId) return;
    
    // Check for scheduled backups every 30 seconds
    this.intervalId = window.setInterval(() => {
      this.checkSchedule();
    }, 30000);
    
    // Perform an immediate scan for newer backups on start
    this.scanForNewerBackups();
    
    console.log("Local Backup Engine active.");
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async scanForNewerBackups() {
    try {
      const handle = await getDirectoryHandle();
      if (!handle) return;

      const hasPerm = await verifyPermission(handle, false);
      if (!hasPerm) return;

      let latestFile: { name: string, date: Date, data: any } | null = null;

      // @ts-ignore
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name.includes('AAPro')) {
          const file = await (entry as FileSystemFileHandle).getFile();
          const fileDate = new Date(file.lastModified);
          
          if (!latestFile || fileDate > latestFile.date) {
            const text = await file.text();
            try {
              const data = JSON.parse(text);
              latestFile = { name: entry.name, date: fileDate, data };
            } catch (e) {}
          }
        }
      }

      if (latestFile) {
        const lastBackupStr = db.getCloudConfig().lastBackup;
        const currentLocalTime = lastBackupStr ? new Date(lastBackupStr) : new Date(0);

        // If file is newer than our last recorded backup timestamp by at least 1 minute
        if (latestFile.date.getTime() > currentLocalTime.getTime() + 60000) {
          window.dispatchEvent(new CustomEvent('new-backup-detected', { 
            detail: { 
              name: latestFile.name, 
              date: latestFile.date.toLocaleString(),
              data: latestFile.data 
            } 
          }));
        }
      }
    } catch (error) {
      console.error("Path scan failed", error);
    }
  }

  private async checkSchedule() {
    const config = db.getCloudConfig();
    if (!config.autoBackup || !config.backupSchedules?.length) return;

    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (this.lastSyncMinute === current) return;

    if (config.backupSchedules.includes(current)) {
      this.lastSyncMinute = current;
      console.log("Triggering scheduled local backup...");
      await this.performLocalBackup();
      
      db.updateCloudConfig({
        ...config,
        lastBackup: new Date().toISOString()
      });
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
      const fileName = `AAPro_Local_${profile.name.replace(/\s+/g, '_')}_${ts}.json`;
      
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      
      const data = db.getBackupData();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      
      return true;
    } catch (error) {
      console.error("Local path backup failed", error);
      return false;
    }
  }
}

export const autoBackupService = new AutoBackupService();
