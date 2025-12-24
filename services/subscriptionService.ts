
import { db } from './db';
import { SubscriptionInfo } from '../types';

const SECRET_SALT = "AA_PRO_NPL_2024_DEV_SALT";

export type LicenseDuration = '7' | '30' | '90' | '180' | '365' | '36500';
const DURATION_MAP: Record<string, number> = {
  'W': 7,
  'M': 30,
  'Q': 90,
  'S': 180,
  'Y': 365,
  'L': 36500 
};

export const subscriptionService = {
  getDeviceId(): string {
    let id = localStorage.getItem('aapro_device_sig');
    if (!id) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const txt = 'AA-PRO-FINGERPRINT-2025';
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125,1,62,20);
        ctx.fillStyle = "#069";
        ctx.fillText(txt, 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText(txt, 4, 17);
      }
      const base64 = canvas.toDataURL().replace("data:image/png;base64,","");
      let hash = 0;
      for (let i = 0; i < base64.length; i++) {
          hash = ((hash << 5) - hash) + base64.charCodeAt(i);
          hash = hash & hash; 
      }
      const fingerprint = Math.abs(hash).toString(16).toUpperCase();
      id = `NODE-${fingerprint}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem('aapro_device_sig', id);
    }
    return id;
  },

  generateSignature(base: string, deviceId: string): string {
    let hash = 0;
    const combined = base + deviceId + SECRET_SALT;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 4).toUpperCase().padStart(4, '0');
  },

  verifyKey(key: string): boolean {
    // Basic format check
    const parts = key.split('-');
    if (parts.length !== 4 || parts[0] !== 'AA') return false;
    return true; // Auto-verify for rolled back version
  },

  createNewLicenseKey(deviceId: string, durationDays: number): string {
    return "AA-FREE-ROLL-BACK";
  },

  getSubscriptionStatus() {
    // Hardcoded to return active status
    return { 
      isSubscribed: true, 
      daysRemaining: 9999, 
      status: 'active',
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9999).toISOString(),
      deviceId: this.getDeviceId()
    };
  },

  activateLicense(key: string): boolean {
    return true;
  }
};
