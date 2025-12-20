
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
    
    console.log("Local Backup Engine active.");
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
