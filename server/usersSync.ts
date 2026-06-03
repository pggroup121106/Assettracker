import type { AppUser } from "./dataStore.js";
import { readAppData, writeAppData } from "./dataStore.js";
import { readCache, readCacheStale, writeCache, deleteCache, getCacheAge } from "./cacheStore.js";
import { getAllUsers } from "./usersService.js";

const CACHE_KEY = "users";
const FRESH_MS = 3 * 60 * 1000;

let syncPromise: Promise<AppUser[]> | null = null;

type SyncDeps = {
  proxyToGas: (payload: Record<string, unknown>, timeoutMs?: number) => Promise<unknown>;
  gasWebappUrl?: string;
  spreadsheetId?: string;
  usersSheetGid?: string;
  listFromGoogleApi?: (id: string, gid: string) => Promise<AppUser[] | null>;
};

export function getCachedUsers(): AppUser[] {
  const fresh = readCache<AppUser[]>(CACHE_KEY, FRESH_MS);
  if (fresh?.length) return fresh;
  const stale = readCacheStale<AppUser[]>(CACHE_KEY);
  if (stale?.length) return stale;
  return readAppData().users;
}

export function invalidateUsersCache() {
  deleteCache(CACHE_KEY);
}

export function getUsersSyncMeta() {
  const age = getCacheAge(CACHE_KEY);
  return {
    cacheAgeMs: age,
    isFresh: age !== null && age < FRESH_MS,
    syncing: !!syncPromise,
  };
}

export async function getUsersWithCache(deps: SyncDeps, force = false): Promise<{
  users: AppUser[];
  fromCache: boolean;
  syncing: boolean;
}> {
  const local = readAppData().users;
  const fresh = readCache<AppUser[]>(CACHE_KEY, FRESH_MS);

  if (fresh && fresh.length > 0 && !force) {
    void syncUsersInBackground(deps);
    return { users: fresh, fromCache: true, syncing: !!syncPromise };
  }

  if (local.length > 0 && !force) {
    void syncUsersInBackground(deps);
    return { users: local, fromCache: true, syncing: true };
  }

  const users = await syncUsersNow(deps);
  return { users, fromCache: false, syncing: false };
}

export function syncUsersInBackground(deps: SyncDeps): Promise<AppUser[]> {
  if (!syncPromise) {
    syncPromise = pullUsers(deps)
      .then((users) => {
        if (users.length > 0) {
          writeCache(CACHE_KEY, users);
          const data = readAppData();
          data.users = users;
          writeAppData(data);
        }
        return users;
      })
      .catch((err) => {
        console.warn("Background users sync failed:", err);
        return getCachedUsers();
      })
      .finally(() => {
        syncPromise = null;
      });
  }
  return syncPromise;
}

async function pullUsers(deps: SyncDeps): Promise<AppUser[]> {
  return getAllUsers(
    deps.proxyToGas,
    deps.gasWebappUrl,
    deps.spreadsheetId,
    deps.usersSheetGid,
    deps.listFromGoogleApi
  );
}

export async function syncUsersNow(deps: SyncDeps): Promise<AppUser[]> {
  const users = await pullUsers(deps);
  if (users.length > 0) {
    writeCache(CACHE_KEY, users);
    const data = readAppData();
    data.users = users;
    writeAppData(data);
  }
  return users.length > 0 ? users : readAppData().users;
}
