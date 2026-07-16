"use client";

import { openDB, type IDBPDatabase } from "idb";
import { getSupabaseBrowser } from "./supabase/client";

/**
 * Offline outbox (idb): failed mutations are queued as raw Supabase REST calls
 * and replayed by the service worker on Background Sync / reconnect.
 */

const DB_NAME = "pulse-outbox";
const STORE = "requests";

export interface OutboxItem {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  label: string; // human-readable, for "Pending sync" UI
  queuedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch failed|Failed to fetch|NetworkError|network request failed/i.test(msg);
}

/** Queue an insert to be replayed when connectivity returns. */
export async function queueInsert(
  table: string,
  payload: Record<string, unknown>,
  label = `Save to ${table}`
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const item: OutboxItem = {
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token ?? anonKey}`,
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
    label,
    queuedAt: Date.now(),
  };

  await (await db()).add(STORE, item);
  await requestSync();
}

export async function pendingCount(): Promise<number> {
  try {
    return await (await db()).count(STORE);
  } catch {
    return 0;
  }
}

export async function pendingItems(): Promise<OutboxItem[]> {
  try {
    return (await (await db()).getAll(STORE)) as OutboxItem[];
  } catch {
    return [];
  }
}

export async function requestSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const syncReg = reg as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };
  if (syncReg.sync) {
    await syncReg.sync.register("pulse-outbox-sync").catch(() => {
      reg.active?.postMessage({ type: "REPLAY_OUTBOX" });
    });
  } else {
    reg.active?.postMessage({ type: "REPLAY_OUTBOX" });
  }
}
