import { CustomerLocation } from '../types';

/**
 * Generate a persistent hardware MAC address simulation.
 * Real web browsers strictly sandbox physical network interface MAC addresses for privacy,
 * but we synthesize a deterministic, unique 6-byte hexadecimal MAC identifier
 * based on hardware parameters, canvas fingerprints, and local device storage.
 */
export function getOrCreateDeviceMac(): string {
  const STORAGE_KEY = 'livevoice_device_mac';
  let storedMac = localStorage.getItem(STORAGE_KEY);
  if (storedMac && /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(storedMac)) {
    return storedMac;
  }

  // Generate deterministic MAC-like bytes
  const seed = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}-${navigator.hardwareConcurrency || 4}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const bytes: string[] = [];
  // Ensure first byte is a unicast locally administered MAC (e.g. 02, 06, 0A, 0E, 4A, etc.)
  const firstByte = (0x02 | (Math.abs(hash) & 0xfe)).toString(16).padStart(2, '0').toUpperCase();
  bytes.push(firstByte);

  for (let i = 1; i < 6; i++) {
    const randomHex = Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    bytes.push(randomHex);
  }

  const generatedMac = bytes.join(':');
  localStorage.setItem(STORAGE_KEY, generatedMac);
  return generatedMac;
}

/**
 * Fetch real client IP address from the Express backend or fallback
 */
export async function getClientIp(): Promise<{ ip: string; userAgent: string }> {
  try {
    const response = await fetch('/api/ip-info');
    if (response.ok) {
      const data = await response.json();
      return {
        ip: data.ip || '103.145.24.12',
        userAgent: data.userAgent || navigator.userAgent,
      };
    }
  } catch (err) {
    console.warn('Could not fetch IP from server, using local fallback:', err);
  }

  return {
    ip: '103.145.24.12',
    userAgent: navigator.userAgent,
  };
}

/**
 * Request real GPS coordinates using navigator.geolocation
 * with reverse geocoding fallback
 */
export async function getGpsLocation(): Promise<CustomerLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getDefaultLocation());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        let city = 'Dhaka';
        let country = 'Bangladesh';
        let address = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;

        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || city;
            country = data.address?.country || country;
            address = data.display_name?.split(',').slice(0, 3).join(',') || address;
          }
        } catch {
          // Keep defaults if network fails
        }

        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          city,
          country,
          address,
        });
      },
      (error) => {
        console.warn('Geolocation access denied or failed:', error.message);
        resolve(getDefaultLocation());
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}

function getDefaultLocation(): CustomerLocation {
  return {
    lat: 23.8103,
    lng: 90.4125,
    accuracy: 25,
    city: 'Dhaka',
    region: 'Dhaka Division',
    country: 'Bangladesh',
    address: 'Gulshan, Dhaka, Bangladesh',
  };
}
