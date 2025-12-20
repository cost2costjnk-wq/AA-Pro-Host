

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
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse: any) => {
          this.accessToken = tokenResponse.access_token;
          onTokenCallback(tokenResponse);
        },
      });
    } else {
      console.warn("Google Identity Services script not loaded.");
    }
  }

  requestToken() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    } else {
      console.warn("Token client not initialized. Check Client ID.");
    }
  }

  async uploadBackup(fileName: string, content: string): Promise<{ success: boolean; message: string }> {
    // 1. Simulation Mode (If no access token or client ID)
    const config = db.getCloudConfig();
    if (!config.googleClientId || !this.accessToken) {
      console.log("Simulating Cloud Backup...");
      await new Promise(resolve => setTimeout(resolve, 2000)); // Fake network delay
      return { success: true, message: 'Backup simulated successfully (No valid Google Client ID configured).' };
    }

    // 2. Real Upload Logic
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
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Upload failed');
      }

      return { success: true, message: 'Backup uploaded to Google Drive successfully.' };
    } catch (error: any) {
      console.error("Drive Upload Error:", error);
      return { success: false, message: `Upload failed: ${error.message}` };
    }
  }

  // Helper to generate full backup JSON string using centralized DB method
  generateBackupData(): string {
    const data = db.getBackupData();
    return JSON.stringify(data, null, 2);
  }
}

export const cloudService = new CloudService();
