import { useState, useEffect, useCallback, useRef } from 'react';

export interface AppUser {
  email: string;
  role: string;
  locations: string[];
  plants: string[];
  categories?: string[];
  allowDelete?: boolean;
}

function normalizeUserRow(u: Record<string, unknown>): AppUser {
  const loc = u.locations ?? u.Locations;
  const plt = u.plants ?? u.Plants;
  const cats = u.categories ?? u.Categories ?? u.category ?? u.access;
  return {
    email: String(u.email || u.Email || '').trim().toLowerCase(),
    role: String(u.role || u.Role || 'User'),
    locations: Array.isArray(loc)
      ? loc.map(String)
      : typeof loc === 'string'
        ? loc.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    plants: Array.isArray(plt)
      ? plt.map(String)
      : typeof plt === 'string'
        ? plt.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    categories: Array.isArray(cats)
      ? cats.map(String)
      : typeof cats === 'string'
        ? cats.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    allowDelete: !!u.allowDelete || String(u.allowDelete) === 'true',
  };
}

function extractUserList(data: unknown): AppUser[] {
  if (Array.isArray(data)) {
    return data
      .map((u) => normalizeUserRow(u as Record<string, unknown>))
      .filter((u) => u.email);
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.users)) return extractUserList(obj.users);
  }
  return [];
}

const STORAGE_KEY = 'assestflow_users_cache';

function readOfflineUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return extractUserList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeOfflineUsers(users: AppUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    /* quota */
  }
}

export function useUsersData() {
  const offlineSeed = readOfflineUsers();
  const [users, setUsers] = useState<AppUser[]>(offlineSeed);
  const [initialLoading, setInitialLoading] = useState(offlineSeed.length === 0);
  const [syncing, setSyncing] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(offlineSeed.length > 0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const loadUsers = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    const force = options?.force ?? false;
    const silent = options?.silent ?? false;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent && !hasDataRef.current) {
      setInitialLoading(true);
    } else if (force) {
      setSyncing(true);
    }

    try {
      const localRes = await fetch((import.meta.env.VITE_API_BASE_URL || "") + '/api/users/local', { signal: controller.signal });
      if (localRes.ok) {
        const localUsers = extractUserList(await localRes.json());
        if (localUsers.length > 0 && mountedRef.current) {
          setUsers(localUsers);
          writeOfflineUsers(localUsers);
          hasDataRef.current = true;
          setInitialLoading(false);
        }
      }

      const url = force ? '/api/users?refresh=1' : '/api/users';
      const res = await fetch(url, { signal: controller.signal });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('Server returned HTML. Run: npm run dev — then open http://localhost:3000');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load users');
      }

      const next = extractUserList(data);
      if (mountedRef.current && next.length > 0) {
        setUsers(next);
        writeOfflineUsers(next);
        hasDataRef.current = true;
        setSyncHint(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;

      const offline = readOfflineUsers();
      if (offline.length > 0 && mountedRef.current) {
        setUsers(offline);
        hasDataRef.current = true;
        if (!silent) {
          setSyncHint('Showing saved users — database sync will retry automatically.');
        }
      } else if (mountedRef.current && !silent) {
        setSyncHint(err instanceof Error ? err.message : 'Could not load users.');
      }
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers({ silent: hasDataRef.current });
    const interval = setInterval(() => loadUsers({ silent: true }), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadUsers]);

  return {
    users,
    initialLoading,
    syncing,
    syncHint,
    refreshUsers: () => loadUsers({ force: true, silent: true }),
  };
}
