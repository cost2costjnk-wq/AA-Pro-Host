// A simplified AD to BS converter and vice versa
// Reference: April 13, 2024 = Baisakh 1, 2081
// This covers the current fiscal year window reasonably well for a demo.

const REF_AD_YEAR = 2024;
const REF_AD_MONTH = 3; // April (0-indexed)
const REF_AD_DAY = 13;

const REF_BS_YEAR = 2081;
const REF_BS_MONTH = 0; // Baisakh (0-indexed)
const REF_BS_DAY = 1;

// Approximate days in Nepali months as provided by user
const BS_MONTH_DAYS = [31, 31, 32, 32, 31, 30, 30, 30, 29, 29, 30, 30];
const BS_MONTH_NAMES = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Asoj', 
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const getBsMonthDays = (year: number, monthIndex: number): number => {
  // Simple approximation: In reality, this varies by year.
  return BS_MONTH_DAYS[monthIndex % 12];
};

export const adToBs = (date: Date): { year: number; month: number; day: number; monthName: string } => {
  const refDate = new Date(REF_AD_YEAR, REF_AD_MONTH, REF_AD_DAY);
  const targetDate = new Date(date);
  
  refDate.setHours(0,0,0,0);
  targetDate.setHours(0,0,0,0);

  const diffTime = targetDate.getTime() - refDate.getTime();
  let diffDays = Math.round(diffTime / ONE_DAY_MS);

  let bsYear = REF_BS_YEAR;
  let bsMonth = REF_BS_MONTH;
  let bsDay = REF_BS_DAY;

  while (diffDays > 0) {
    const daysInCurrentMonth = BS_MONTH_DAYS[bsMonth];
    const daysLeftInMonth = daysInCurrentMonth - bsDay + 1;

    if (diffDays < daysLeftInMonth) {
      bsDay += diffDays;
      diffDays = 0;
    } else {
      diffDays -= daysLeftInMonth;
      bsDay = 1;
      bsMonth++;
      if (bsMonth > 11) {
        bsMonth = 0;
        bsYear++;
      }
    }
  }

  while (diffDays < 0) {
    if (Math.abs(diffDays) < bsDay) {
      bsDay += diffDays;
      diffDays = 0;
    } else {
      diffDays += bsDay;
      bsMonth--;
      if (bsMonth < 0) {
        bsMonth = 11;
        bsYear--;
      }
      bsDay = BS_MONTH_DAYS[bsMonth];
    }
  }

  return {
    year: bsYear,
    month: bsMonth + 1,
    day: bsDay,
    monthName: BS_MONTH_NAMES[bsMonth]
  };
};

export const bsToAd = (bsYear: number, bsMonth: number, bsDay: number): Date => {
  const monthIndex = bsMonth - 1;
  let totalDays = 0;
  const yearDiff = bsYear - REF_BS_YEAR;
  
  if (yearDiff > 0) {
     for (let y = REF_BS_YEAR; y < bsYear; y++) {
        totalDays += 365; 
     }
  } else if (yearDiff < 0) {
     for (let y = bsYear; y < REF_BS_YEAR; y++) {
        totalDays -= 365;
     }
  }

  for (let m = 0; m < monthIndex; m++) {
    totalDays += BS_MONTH_DAYS[m];
  }

  totalDays += (bsDay - 1);

  const adDate = new Date(REF_AD_YEAR, REF_AD_MONTH, REF_AD_DAY);
  adDate.setDate(adDate.getDate() + totalDays);
  
  return adDate;
};

/**
 * Validates a DD/MM/YYYY string
 */
export const isValidBsDate = (dateStr: string): boolean => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    if (y < 2000 || y > 2150) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 32) return false;
    return true;
};

export const formatNepaliDate = (isoDateString: string): string => {
  if (!isoDateString) return '-';
  const date = new Date(isoDateString);
  const bs = adToBs(date);
  // Format switched to DD/MM/YYYY as requested
  return `${String(bs.day).padStart(2, '0')}/${String(bs.month).padStart(2, '0')}/${bs.year}`;
};

export const getNepaliMonthDay = (isoDateString: string): string => {
  if (!isoDateString) return '-';
  const date = new Date(isoDateString);
  const bs = adToBs(date);
  return `${bs.monthName} ${bs.day}`;
};

export const getCurrentNepaliDate = (): string => {
  return formatNepaliDate(new Date().toISOString());
};

export const getCurrentBsParts = () => {
    return adToBs(new Date());
};

export const BS_MONTHS = BS_MONTH_NAMES;