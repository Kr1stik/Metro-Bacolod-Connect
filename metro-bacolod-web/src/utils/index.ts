import type { MortgageResult } from '../types';

// ============================================
// Shared Utility Functions
// ============================================

/**
 * Calculate monthly mortgage payment
 */
export function calculateMortgage(
  propertyPrice: number,
  downPaymentPercent: number,
  annualRate: number,
  termYears: number
): MortgageResult {
  const downPayment = propertyPrice * (downPaymentPercent / 100);
  const principal = propertyPrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;
  if (monthlyRate === 0) {
    return {
      monthlyPayment: principal / totalPayments,
      totalPayment: principal,
      totalInterest: 0,
      principal,
      downPayment,
    };
  }
  const monthlyPayment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const totalPayment = monthlyPayment * totalPayments;
  const totalInterest = totalPayment - principal;
  return { monthlyPayment, totalPayment, totalInterest, principal, downPayment };
}

/**
 * Parse price string to numeric value
 * Handles "1.5 Million", "2 Billion", plain numbers, etc.
 */
export function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.toLowerCase().replace(/[^0-9.]/g, ' ').trim();
  const parts = cleaned.split(/\s+/);
  const num = parseFloat(parts[0]);
  if (isNaN(num)) return 0;
  if (priceStr.toLowerCase().includes('million')) return num * 1_000_000;
  if (priceStr.toLowerCase().includes('billion')) return num * 1_000_000_000;
  return num;
}

/**
 * Format price number for display
 * e.g. 2500000 -> "2.5 Million PHP"
 */
export function formatPriceDisplay(price: string): string {
  const num = parsePriceToNumber(price);
  if (num <= 0) return price;
  if (num >= 1_000_000_000)
    return `${(num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1)} Billion PHP`;
  if (num >= 1_000_000)
    return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)} Million PHP`;
  return `₱${num.toLocaleString()}`;
}

/**
 * Compress image to reduce file size before upload
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas failed');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn('Compression produced null blob, using original.');
              resolve(file);
            } else {
              resolve(
                new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                  type: 'image/jpeg',
                })
              );
            }
            URL.revokeObjectURL(img.src);
          },
          'image/jpeg',
          quality
        );
      } catch (e) {
        console.error('Compression Logic Error:', e);
        resolve(file);
      }
    };
    img.onerror = () => {
      console.error('Image load failed for compression.');
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format time-ago string from ISO date
 */
export function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Bacolod location coordinates for Leaflet maps
 */
export const LOCATION_COORDS: Record<string, [number, number]> = {
  Alijis: [10.656, 122.928],
  Banago: [10.705, 122.952],
  Bata: [10.687, 122.958],
  Cabug: [10.72, 122.94],
  Estefania: [10.679, 122.953],
  Felisa: [10.701, 122.95],
  Granada: [10.672, 122.935],
  Handumanan: [10.648, 122.953],
  Mandalagan: [10.692, 122.943],
  Mansilingan: [10.659, 122.968],
  Montevista: [10.665, 122.942],
  Pahanocoy: [10.67, 122.96],
  'Punta Taytay': [10.71, 122.963],
  'Singcang-Airport': [10.648, 122.932],
  'Sum-ag': [10.637, 122.94],
  Taculing: [10.653, 122.95],
  Tangub: [10.715, 122.942],
  Villamonte: [10.675, 122.95],
  'Vista Alegre': [10.669, 122.948],
};

export const BACOLOD_CENTER: [number, number] = [10.684, 122.951];
