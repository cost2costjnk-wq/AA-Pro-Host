
import { db } from './db';
import { CloudConfig } from '../types';

declare const google: any;

class CloudService {
  private tokenClient: any;
  private accessToken: string | null = null;

  init(config: CloudConfig, onTokenCallback: (tokenResponse: any) => void) {
    if (!config.googleClientId) return;
    
    if (typeof google !== 'undefined' && google.accounts) {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            console.error("Auth error", tokenResponse);
            return;
          }
          this.accessToken = tokenResponse.access_token;
          onTokenCallback(tokenResponse);
        },
      });
    } else {
      console.warn("Google Identity Services script not loaded.");
    }
  }

  async ensureToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;
    
    return new Promise((resolve) => {
      const config = db.getCloudConfig();
      if (!config.googleClientId) return resolve(null);

      this.init(config, (resp) => {
          resolve(resp.access_token);
      });
      this.tokenClient.requestAccessToken({ prompt: 'none' });
    });
  }

  requestToken() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    } else {
      const config = db.getCloudConfig();
      if (config.googleClientId) {
          this.init(config, () => {});
          this.tokenClient.requestAccessToken();
      }
    }
  }

  async listBackups(): Promise<{id: string, name: string, modifiedTime: string}[]> {
    const token = await this.ensureToken();
    if (!token) throw new Error("Google Drive not configured.");

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=name contains "AAPro" and mimeType = "application/json"&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) throw new Error("Failed to list files from Drive");
    const data = await response.json();
    return data.files || [];
  }

  async downloadFile(fileId: string): Promise<any> {
    const token = await this.ensureToken();
    if (!token) throw new Error("Access denied");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) throw new Error("Failed to download backup");
    return await response.json();
  }

  async uploadBackup(fileName: string, content: string): Promise<{ success: boolean; message: string }> {
    const config = db.getCloudConfig();
    const token = await this.ensureToken();

    if (!config.googleClientId || !token) {
      return { success: false, message: 'Google Drive is not configured.' };
    }

    try {
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
      };

      const fileContent = new Blob([content], { type: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileContent);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Upload failed');
      }

      return { success: true, message: 'Backup uploaded to Google Drive.' };
    } catch (error: any) {
      return { success: false, message: `Upload failed: ${error.message}` };
    }
  }

  generateBackupData(): string {
    const data = db.getBackupData();
    return JSON.stringify(data, null, 2);
  }
}

export const cloudService = new CloudService();
