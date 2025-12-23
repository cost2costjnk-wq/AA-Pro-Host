
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
  'L': 36500 // Lifetime approximation
};

const REVERSE_DURATION_MAP: Record<number, string> = {
  7: 'W',
  30: 'M',
  90: 'Q',
  180: 'S',
  365: 'Y',
  36500: 'L'
};

export const subscriptionService = {
  getDeviceId(): string {
    let id = localStorage.getItem('aapro_device_sig');
    if (!id) {
      // Generate a semi-persistent unique fingerprint
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
      
      // Get raw base64 data
      const base64 = canvas.toDataURL().replace("data:image/png;base64,","");
      
      // Hash the base64 string directly instead of using atob()
      // This avoids the 'The string to be decoded is not correctly encoded' error
      let hash = 0;
      for (let i = 0; i < base64.length; i++) {
          hash = ((hash << 5) - hash) + base64.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
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
    const parts = key.split('-');
    if (parts.length !== 4 || parts[0] !== 'AA') return false;

    const deviceId = this.getDeviceId();
    const base = parts[1] + parts[2];
    const providedSignature = parts[3];
    const expectedSignature = this.generateSignature(base, deviceId);

    return providedSignature === expectedSignature;
  },

  createNewLicenseKey(deviceId: string, durationDays: number): string {
    const randomPart = (len: number) => Math.random().toString(36).substring(2, 2 + len).toUpperCase();
    const durCode = REVERSE_DURATION_MAP[durationDays] || 'Y';
    const p1 = durCode + randomPart(3);
    const p2 = randomPart(4);
    const signature = this.generateSignature(p1 + p2, deviceId);
    return `AA-${p1}-${p2}-${signature}`;
  },

  getSubscriptionStatus() {
    const info = db.getSubscriptionInfo();
    const currentDevice = this.getDeviceId();

    if (!info) return { isSubscribed: false, daysRemaining: 0, status: 'none', deviceId: currentDevice };

    if (info.deviceId && info.deviceId !== currentDevice) {
        return { isSubscribed: false, daysRemaining: 0, status: 'invalid_device', deviceId: currentDevice };
    }

    const now = new Date();
    const expiry = new Date(info.expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { isSubscribed: false, daysRemaining: 0, status: 'expired', deviceId: currentDevice };
    }

    return { 
      isSubscribed: true, 
      daysRemaining, 
      status: info.status,
      expiryDate: info.expiresAt,
      deviceId: currentDevice
    };
  },

  activateLicense(key: string): boolean {
    if (!this.verifyKey(key)) return false;

    const parts = key.split('-');
    const durCode = parts[1].charAt(0);
    const daysToAdd = DURATION_MAP[durCode] || 365;

    const activatedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(activatedAt.getDate() + daysToAdd);
    const currentDevice = this.getDeviceId();

    const info: SubscriptionInfo = {
      licenseKey: key,
      activatedAt: activatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
      deviceId: currentDevice
    };

    db.updateSubscriptionInfo(info);
    return true;
  }
};
