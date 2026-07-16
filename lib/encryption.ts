"use client";

import { openDB } from "idb";

/**
 * Client-side E2E encryption (Web Crypto, AES-GCM 256).
 * - A unique key is generated per user on first use and stored ONLY in
 *   IndexedDB — it never touches the server.
 * - Used for: exact location coordinates and private expense notes.
 * - Users can export/import the key from Settings (JWK file) to move devices.
 *
 * Deliberate scope note: expense *amounts* stay plaintext under RLS so that
 * server-side features (budget alert cron, leaderboard budget category) keep
 * working — encrypting them would silently break those.
 */

const DB_NAME = "pulse-keys";
const STORE = "keys";
const KEY_ID = "primary";

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function keyDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    },
  });
}

/** Get (or lazily create) the user's encryption key. Never leaves the device. */
export async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await keyDb();
  const existing = (await db.get(STORE, KEY_ID)) as CryptoKey | undefined;
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  await db.put(STORE, key, KEY_ID);
  return key;
}

export async function hasKey(): Promise<boolean> {
  const db = await keyDb();
  return (await db.get(STORE, KEY_ID)) !== undefined;
}

/** Encrypt a JSON-serializable value → base64 "iv.ciphertext". */
export async function encryptJSON(value: unknown): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  );
  return `${toB64(iv.buffer)}.${toB64(cipher)}`;
}

/** Decrypt a payload produced by encryptJSON. Returns null if key mismatch. */
export async function decryptJSON<T>(payload: string): Promise<T | null> {
  try {
    const [ivB64, cipherB64] = payload.split(".");
    if (!ivB64 || !cipherB64) return null;
    const key = await getOrCreateKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivB64) as unknown as BufferSource },
      key,
      fromB64(cipherB64) as unknown as BufferSource
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

/** Export the key as a downloadable JWK file. */
export async function exportKeyFile(): Promise<void> {
  const key = await getOrCreateKey();
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const blob = new Blob([JSON.stringify(jwk, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pulse-encryption-key.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Import a previously exported JWK key file (replaces the current key). */
export async function importKeyFile(file: File): Promise<boolean> {
  try {
    const jwk = JSON.parse(await file.text()) as JsonWebKey;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
    const db = await keyDb();
    await db.put(STORE, key, KEY_ID);
    return true;
  } catch {
    return false;
  }
}
