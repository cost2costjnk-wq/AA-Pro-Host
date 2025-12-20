
import { db } from './db';
import { CloudConfig } from '../types';

declare const google: any;

const POS_FOLDER_ID = "13zui6HCkDvN37c9MRyGO1qmsDVtPUD4A";
const HARDCODED_CLIENT_ID = "476453033908-4utdf52i85jssocqgghjpcpturfkkeu4.apps.googleusercontent.com";

class CloudService {
  private tokenClient: any = null;
  private accessToken: string | null = null;

  private getClientId(): string {
    return db.getCloudConfig().googleClientId || HARDCODED_CLIENT_ID;
  }

  init(config: CloudConfig, onTokenCallback: (tokenResponse: any) => void) {
    const clientId = this.getClientId();
    if (!clientId) return;
    
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      try {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
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
      } catch (e) {
        console.error("Failed to init Google Token Client", e);
      }
    } else {
        console.warn("Google Identity Services library not yet fully loaded.");
    }
  }

  async ensureToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;
    
    return new Promise((resolve) => {
      const config = db.getCloudConfig();
      const clientId = this.getClientId();
      if (!clientId) return resolve(null);

      // Re-initialize if client is missing
      if (!this.tokenClient) {
          this.init(config, (resp) => {
              resolve(resp.access_token);
          });
      }
      
      if (this.tokenClient) {
        try {
            // Attempt a silent token request
            this.tokenClient.requestAccessToken({ prompt: 'none' });
            // If the callback isn't triggered immediately, we rely on the init callback logic
            // or the user manually triggering a real requestToken() later.
            // For now, we return null to trigger the "Access Denied" which then calls requestToken()
            setTimeout(() => resolve(this.accessToken), 1000);
        } catch (e) {
            resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  }

  requestToken() {
    const clientId = this.getClientId();
    if (!clientId) {
        throw new Error("Google Client ID is missing.");
    }

    if (!this.tokenClient) {
        this.init(db.getCloudConfig(), () => {});
    }

    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    } else {
        throw new Error("Google Auth library is still loading. Please wait a moment and try again.");
    }
  }

  async listBackups(): Promise<{id: string, name: string, modifiedTime: string}[]> {
    const token = await this.ensureToken();
    if (!token) throw new Error("AUTH_REQUIRED");

    const query = `name contains "AAPro" and "${POS_FOLDER_ID}" in parents and mimeType = "application/json" and trashed = false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (response.status === 401) {
        this.accessToken = null;
        throw new Error("AUTH_REQUIRED");
    }

    if (!response.ok) throw new Error("Drive query failed: " + response.statusText);
    const data = await response.json();
    return data.files || [];
  }

  async downloadFile(fileId: string): Promise<any> {
    const token = await this.ensureToken();
    if (!token) throw new Error("AUTH_REQUIRED");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) throw new Error("Download failed");
    return await response.json();
  }

  async uploadBackup(fileName: string, content: string): Promise<{ success: boolean; message: string }> {
    const token = await this.ensureToken();
    if (!token) return { success: false, message: 'AUTH_REQUIRED' };

    try {
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [POS_FOLDER_ID] 
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

      if (!response.ok) throw new Error("Cloud upload rejected");

      return { success: true, message: 'Sync successful.' };
    } catch (error: any) {
      return { success: false, message: `Sync failed: ${error.message}` };
    }
  }
}

export const cloudService = new CloudService();
