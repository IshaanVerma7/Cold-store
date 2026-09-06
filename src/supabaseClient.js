import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in dev rather than silently rendering a broken board.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 5 } }
});

// Anonymous per-device identity (section H of the brief).
// No login: we just remember a random id in localStorage so "Check-In & Reserve"
// can find "my" bookings on this phone without any account.
const DEVICE_KEY = 'cold_store_device_id';
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
