import fs from "fs";
import path from "path";
import { fetchAllAssets, type MappedAsset } from "./assetHelpers.js";
import { readCache, readCacheStale, writeCache, deleteCache } from "./cacheStore.js";
import { readAppData } from "./dataStore.js";

const CACHE_KEY = "assets";
const FRESH_MS = 2 * 60 * 1000;
const STALE_MS = 30 * 60 * 1000;

let refreshPromise: Promise<MappedAsset[]> | null = null;

async function pullFromSheet(gasUrl: string): Promise<MappedAsset[]> {
  const dbMode = readAppData().settings.dbMode;
  return fetchAllAssets(gasUrl, dbMode);
}

export function getCachedAssets(): MappedAsset[] | null {
  return readCache<MappedAsset[]>(CACHE_KEY, FRESH_MS) ?? readCacheStale<MappedAsset[]>(CACHE_KEY);
}

export async function getAssetsWithCache(
  gasUrl: string,
  force = false
): Promise<{ assets: MappedAsset[]; fromCache: boolean; syncing: boolean }> {
  const fresh = readCache<MappedAsset[]>(CACHE_KEY, FRESH_MS);
  if (fresh && !force) {
    void refreshAssetsInBackground(gasUrl);
    return { assets: fresh, fromCache: true, syncing: !!refreshPromise };
  }

  const stale = readCacheStale<MappedAsset[]>(CACHE_KEY);
  if (stale && !force) {
    void refreshAssetsInBackground(gasUrl);
    return { assets: stale, fromCache: true, syncing: true };
  }

  const assets = await refreshAssetsNow(gasUrl);
  return { assets, fromCache: false, syncing: false };
}

export function refreshAssetsInBackground(gasUrl: string): Promise<MappedAsset[]> {
  if (!refreshPromise) {
    refreshPromise = pullFromSheet(gasUrl)
      .then((assets) => {
        writeCache(CACHE_KEY, assets);
        return assets;
      })
      .catch((err) => {
        console.warn("Background asset sync failed:", err);
        return readCacheStale<MappedAsset[]>(CACHE_KEY) || [];
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function refreshAssetsNow(gasUrl: string): Promise<MappedAsset[]> {
  const assets = await pullFromSheet(gasUrl);
  writeCache(CACHE_KEY, assets);
  return assets;
}

export function invalidateAssetCache() {
  deleteCache(CACHE_KEY);
}
