/**
 * Secure Storage Utility for CREEDA
 * Uses Web Crypto API (AES-GCM) for session-keyed encryption.
 */

const ENCRYPTION_KEY_NAME = 'creeda_session_entropy';

/**
 * Generates or retrieves a transient encryption key from sessionStorage.
 * This key survives refreshes but is cleared when the tab is closed.
 */
async function getOrCreateSessionKey(): Promise<CryptoKey> {
  const existingEntropy = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  let entropy: Uint8Array;

  if (existingEntropy) {
    entropy = new Uint8Array(JSON.parse(existingEntropy));
  } else {
    entropy = crypto.getRandomValues(new Uint8Array(32));
    sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(Array.from(entropy)));
  }

  return await crypto.subtle.importKey(
    'raw',
    entropy as any,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string payload using AES-GCM.
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getOrCreateSessionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and Encrypted Content for storage
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    // Return as Base64 for local storage (the content is encrypted, Base64 is just the container)
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('SECURE_STORAGE_FAILURE');
  }
}

/**
 * Decrypts a Base64-encoded encrypted payload.
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  try {
    const key = await getOrCreateSessionKey();
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const content = combined.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      content
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('SECURE_STORAGE_DECRYPTION_FAILURE');
  }
}

/**
 * Clears session and local storage keys related to onboarding.
 */
export function clearSecureStorage(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
}
