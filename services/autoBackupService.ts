
import { db } from './db';
import { getDirectoryHandle, verifyPermission } from './backupStorage';

class AutoBackupService {
  private intervalId: number | null = null;
  private lastBackupMinute: string | null = null;

  start() {
    if (this.intervalId) return;
    
    console.log("Auto-Backup Runner Started");
    // Check every 30 seconds
    this.intervalId = window.setInterval(() => this.checkAndRun(), 30000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkAndRun() {
    const config = db.getCloudConfig();
    if (!config.autoBackup || !config.backupSchedules || config.backupSchedules.length === 0) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Prevent multiple backups in the same minute
    if (this.lastBackupMinute === currentTime) return;

    if (config.backupSchedules.includes(currentTime)) {
      console.log(`Scheduled backup triggered for ${currentTime}`);
      const success = await this.performLocalBackup();
      if (success) {
        this.lastBackupMinute = currentTime;
        db.updateCloudConfig({
          ...config,
          lastBackup: new Date().toISOString()
        });
      }
    }
  }

  async performLocalBackup(): Promise<boolean> {
    try {
      const handle = await getDirectoryHandle();
      if (!handle) return false;

      const hasPermission = await verifyPermission(handle, true);
      if (!hasPermission) return false;

      const profile = db.getBusinessProfile();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `AAPro_AutoBackup_${profile.name.replace(/\s+/g, '_')}_${timestamp}.json`;
      
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      
      const data = db.getBackupData();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      
      console.log(`Auto-backup saved: ${fileName}`);
      return true;
    } catch (error) {
      console.error("Auto-backup failed", error);
      return false;
    }
  }
}

export const autoBackupService = new AutoBackupService();
