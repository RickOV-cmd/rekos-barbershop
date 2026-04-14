'use strict';

/* ─── SUPABASE CLIENT ─── */
const SUPABASE_URL = 'https://zxiuupkoxdovboscdlmr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ubZu6JRXwa42wDqSxWWfyQ_O_JvrOCm';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fetch all site settings from Supabase.
 * Falls back to empty object if not yet configured.
 */
async function fetchSiteSettings() {
  try {
    const { data, error } = await _supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data?.settings || {};
  } catch (e) {
    console.warn('[Supabase] Could not load settings, using defaults.', e.message);
    return {};
  }
}

/**
 * Save site settings to Supabase (requires authenticated session).
 */
async function saveSiteSettings(settings) {
  const { error } = await _supabase
    .from('site_settings')
    .upsert({ id: 1, settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/**
 * Upload a file to the gallery storage bucket.
 * Returns the public URL.
 */
async function uploadGalleryImage(file, slot) {
  const ext      = file.name.split('.').pop();
  const fileName = `gallery-${slot}.${ext}`;

  // Overwrite if exists
  const { error: uploadError } = await _supabase.storage
    .from('gallery')
    .upload(fileName, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = _supabase.storage.from('gallery').getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Sign in admin with email + password.
 */
async function adminSignIn(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign out admin.
 */
async function adminSignOut() {
  await _supabase.auth.signOut();
}

/**
 * Get current auth session.
 */
async function getSession() {
  const { data } = await _supabase.auth.getSession();
  return data?.session || null;
}
