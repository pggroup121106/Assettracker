import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import type { Asset, AssetFormData } from '../types';
import type { AppSessionUser } from '../types/session';
import { mapAssetsFromApi } from '../lib/assetMap';
import { MAIN_CATEGORIES, PERIPHERAL_TYPES } from '../lib/assetCatalogByType';
import {
  ASSETS_CACHE_KEY,
  DAY_MS,
  LEGACY_LOGIN_KEY,
  LEGACY_USER_KEY,
  LOGIN_TIME_KEY,
  USER_STORAGE_KEY,
} from '../lib/constants';

function normalizeUser(raw: Record<string, unknown>): AppSessionUser {
  const cats = raw.categories ?? raw.Categories ?? raw.category ?? raw.access;
  return {
    email: String(raw.email || '').trim().toLowerCase(),
    role: String(raw.role || 'User'),
    locations: Array.isArray(raw.locations)
      ? (raw.locations as string[])
      : String(raw.locations || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    plants: Array.isArray(raw.plants)
      ? (raw.plants as string[])
      : String(raw.plants || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    categories: Array.isArray(cats)
      ? (cats as string[])
      : typeof cats === 'string'
        ? cats.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    allowDelete: !!raw.allowDelete || String(raw.allowDelete) === 'true',
  };
}

interface AppContextValue {
  user: AppSessionUser | null;
  authChecked: boolean;
  assets: Asset[];
  loading: boolean;
  visibleCategories: string[];
  fetchAssets: (opts?: { silent?: boolean; force?: boolean }) => Promise<void>;
  handleSubmit: (formData: AssetFormData, editingAsset: Asset | null) => Promise<void>;
  executeDelete: (id: number | string) => Promise<void>;
  handleLogout: () => void;
  loginSuccess: (user: AppSessionUser) => void;
  filterAssets: (
    assets: Asset[],
    opts: { searchQuery: string; selectedCategory: string }
  ) => Asset[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AppSessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const assetsLoadedRef = useRef(false);

  const handleLogout = useCallback(() => {
    setUser(null);
    setAssets([]);
    assetsLoadedRef.current = false;
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.removeItem(LOGIN_TIME_KEY);
    localStorage.removeItem(LEGACY_LOGIN_KEY);
  }, []);

  const loginSuccess = useCallback(
    (userData: AppSessionUser) => {
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userData));
      const now = Date.now().toString();
      localStorage.setItem(LOGIN_TIME_KEY, now);
      localStorage.setItem(LEGACY_LOGIN_KEY, now);
      setTimeout(() => {
        toast.error('Session expired. Please login again.');
        handleLogout();
      }, DAY_MS);
    },
    [handleLogout]
  );

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_USER_KEY);
      const ts =
        localStorage.getItem(LOGIN_TIME_KEY) || localStorage.getItem(LEGACY_LOGIN_KEY);
      if (stored && ts) {
        const parsedUser = normalizeUser(JSON.parse(stored));
        const loginTime = parseInt(ts, 10);
        const now = Date.now();
        if (now - loginTime < DAY_MS) {
          setUser(parsedUser);

          fetch((import.meta.env.VITE_API_BASE_URL || "") + '/api/users')
            .then((r) => (r.ok ? r.json() : null))
            .then((usersList) => {
              if (usersList && Array.isArray(usersList)) {
                const fresh = usersList.find(
                  (u: { email: string }) =>
                    u.email.toLowerCase() === parsedUser.email.toLowerCase()
                );
                if (fresh) {
                  const freshUser = normalizeUser(fresh as Record<string, unknown>);
                  setUser(freshUser);
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
                  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(freshUser));
                }
              }
            })
            .catch(() => {});

          const remaining = DAY_MS - (now - loginTime);
          const timer = setTimeout(() => {
            toast.error('Session expired. Please login again.');
            handleLogout();
          }, remaining);
          setAuthChecked(true);
          return () => clearTimeout(timer);
        }
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(LEGACY_USER_KEY);
        localStorage.removeItem(LOGIN_TIME_KEY);
        localStorage.removeItem(LEGACY_LOGIN_KEY);
      }
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      localStorage.removeItem(LOGIN_TIME_KEY);
      localStorage.removeItem(LEGACY_LOGIN_KEY);
    }
    setAuthChecked(true);
  }, [handleLogout]);

  const loadAssetsFromCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(ASSETS_CACHE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAssets(parsed);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }, []);

  const fetchAssets = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const url = opts?.force ? '/api/assets?refresh=1' : '/api/assets';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load assets');
      const data = await res.json();
      const mapped = mapAssetsFromApi(data);
      setAssets(mapped);
      localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify(mapped));
    } catch {
      if (!loadAssetsFromCache()) {
        toast.error('Failed to load assets. Check connection and refresh.');
      } else if (!silent) {
        toast.error('Showing saved assets — sheet sync will retry.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadAssetsFromCache]);

  useEffect(() => {
    if (user && !assetsLoadedRef.current) {
      assetsLoadedRef.current = true;
      const hadCache = loadAssetsFromCache();
      fetchAssets({ silent: hadCache });
    }
    if (!user) {
      assetsLoadedRef.current = false;
    }
  }, [user, fetchAssets, loadAssetsFromCache]);

  const visibleCategories = useMemo(() => {
    if (
      !user ||
      user.role === 'IT Admin' ||
      !user.categories ||
      user.categories.length === 0 ||
      user.categories.includes('All')
    ) {
      return [...MAIN_CATEGORIES];
    }
    return MAIN_CATEGORIES.filter((cat) => user.categories?.includes(cat));
  }, [user]);

  const filterAssets = useCallback(
    (list: Asset[], opts: { searchQuery: string; selectedCategory: string }) => {
      let filtered = list;
      const { searchQuery, selectedCategory } = opts;

      if (selectedCategory !== 'All') {
        filtered = filtered.filter((a) => (a.mainCategory || 'IT Assets') === selectedCategory);
      }

      if (user && user.role !== 'IT Admin') {
        if (user.locations?.length && !user.locations.includes('All')) {
          filtered = filtered.filter((a) =>
            user.locations.some((loc) =>
              (a.location || '').toLowerCase().includes(loc.toLowerCase())
            )
          );
        }
        if (user.plants?.length && !user.plants.includes('All')) {
          filtered = filtered.filter((a) =>
            user.plants.some((p) => (a.plantCode || '').toLowerCase().includes(p.toLowerCase()))
          );
        }
        if (user.categories?.length && !user.categories.includes('All')) {
          filtered = filtered.filter((a) =>
            user.categories?.includes(a.mainCategory || 'IT Assets')
          );
        }
      }

      if (!searchQuery) return filtered;
      const search = searchQuery.toLowerCase();
      return filtered.filter((asset) =>
        [
          asset.id?.toString(),
          asset.assetCode,
          asset.mainCategory,
          asset.serialNumber,
          asset.vendorName,
          asset.macAddress,
          asset.location,
          asset.plantCode,
          asset.monitorAssetCode,
          asset.keyboardAssetCode,
          asset.mouseAssetCode,
          asset.upsAssetCode,
          asset.contactName,
          asset.make,
          asset.model,
          asset.department,
          asset.assetName,
          asset.subCategory,
          asset.employeeId,
          asset.contactEmail,
        ].some((field) => (field?.toString() || '').toLowerCase().includes(search))
      );
    },
    [user]
  );

  const handleSubmit = useCallback(
    async (formData: AssetFormData, editingAsset: Asset | null) => {
      const isIT = (formData.mainCategory || 'IT Assets') === 'IT Assets';
      const isLaptopOrDesktop =
        formData.assetTypeId === 'laptop' ||
        formData.assetTypeId === 'desktop' ||
        (isIT && ['Laptop', 'Desktop'].includes(formData.assetType));
      const isDesktop = isIT && formData.assetType === 'Desktop';
      const isPeripheral = isIT && PERIPHERAL_TYPES.includes(formData.assetType);

      let cleanRemarks = formData.additionalItems || '';
      const tLower = String(formData.assetType || '').toLowerCase();
      const allowedTypes = ['laptop', 'desktop', 'input device', 'output device', 'laptop / desktop'];
      const isAllowed = allowedTypes.some((t) => tLower.includes(t));
      if (!isAllowed && cleanRemarks) {
        const wordsToRemove = ['case', 'charger', 'adapter', 'adpater', 'etc'];
        for (const word of wordsToRemove) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          cleanRemarks = cleanRemarks.replace(regex, '');
        }
        cleanRemarks = cleanRemarks
          .replace(/,\s*,/g, ',')
          .replace(/\s+/g, ' ')
          .replace(/,\s*\./g, '.')
          .replace(/^\s*,\s*/g, '')
          .replace(/,\s*$/g, '')
          .trim();
        if (cleanRemarks === '.' || cleanRemarks === ',' || cleanRemarks === ',.') {
          cleanRemarks = '';
        }
      }

      const cleanedData = {
        ...formData,
        dynamicDetails: formData.dynamicDetails || {},
        assetTypeId: formData.assetTypeId || '',
        ram: isLaptopOrDesktop ? formData.ram : '',
        ssd: isLaptopOrDesktop ? formData.ssd : '',
        cpu: isLaptopOrDesktop ? formData.cpu : '',
        windowsVersion: isLaptopOrDesktop ? formData.windowsVersion : '',
        macAddress: isIT && !isPeripheral ? formData.macAddress : '',
        monitorAssetCode: isDesktop ? formData.monitorAssetCode : '',
        monitorSerial: isDesktop ? formData.monitorSerial : '',
        keyboardAssetCode: isDesktop ? formData.keyboardAssetCode : '',
        keyboardSerial: isDesktop ? formData.keyboardSerial : '',
        mouseAssetCode: isDesktop ? formData.mouseAssetCode : '',
        mouseSerial: isDesktop ? formData.mouseSerial : '',
        upsAssetCode: isDesktop ? formData.upsAssetCode : '',
        upsSerial: isDesktop ? formData.upsSerial : '',
        additionalItems: cleanRemarks,
      };

      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editingAsset ? 'Asset updated!' : 'Asset registered!');
      await fetchAssets();
    },
    [fetchAssets]
  );

  const executeDelete = useCallback(
    async (id: number | string) => {
      if (!user) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/assets/${id}?userEmail=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      toast.success('Asset deleted');
      await fetchAssets();
    },
    [fetchAssets, user]
  );

  const value = useMemo(
    () => ({
      user,
      authChecked,
      assets,
      loading,
      visibleCategories,
      fetchAssets,
      handleSubmit,
      executeDelete,
      handleLogout,
      loginSuccess,
      filterAssets,
    }),
    [
      user,
      authChecked,
      assets,
      loading,
      visibleCategories,
      fetchAssets,
      handleSubmit,
      executeDelete,
      handleLogout,
      loginSuccess,
      filterAssets,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { normalizeUser };
