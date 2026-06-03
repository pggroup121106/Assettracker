import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Plus, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import type { MissingItemRecord } from '../types/redesigned';
import { parseJsonResponse } from '../lib/apiFetch';
import { SYNC_DATABASE_MSG, SYNC_DATABASE_OK, SYNC_DATABASE_ERR } from '../lib/uiLabels';
import { useApp } from '../context/AppProvider';
import MarkMissingModal from '../components/MarkMissingModal';

export default function MissingItemsPage() {
  const navigate = useNavigate();
  const { assets } = useApp();
  const [items, setItems] = useState<MissingItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Missing' | 'Recovered'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const url = force ? '/api/missing-items?refresh=1' : '/api/missing-items';
      const res = await fetch(url);
      const data = await parseJsonResponse<{ items?: MissingItemRecord[] }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Load failed');
      setItems(data.items || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load missing items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.Status !== statusFilter) return false;
      if (!q) return true;
      return (
        it['Parent Asset ID']?.toLowerCase().includes(q) ||
        it['Parent Asset Name']?.toLowerCase().includes(q) ||
        it['Missing Item Name']?.toLowerCase().includes(q) ||
        it['Assigned Person']?.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const markRecovered = async (record: MissingItemRecord) => {
    try {
      const res = await fetch(`/api/missing-items/${encodeURIComponent(record['Record ID'])}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveredBy: 'Admin' }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Update failed');
      toast.success('Marked as recovered');
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 lg:px-8 py-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Missing Items</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track components missing from assigned packages (mouse, charger, etc.)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                toast.promise(load(true), {
                  loading: SYNC_DATABASE_MSG,
                  success: SYNC_DATABASE_OK,
                  error: SYNC_DATABASE_ERR,
                }, { id: 'sync-missing-items' })
              }
              className={`px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2"
            >
              <Plus size={16} /> Report missing
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, item, person…"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold"
          >
            <option value="all">All statuses</option>
            <option value="Missing">Missing</option>
            <option value="Recovered">Recovered</option>
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {loading && items.length === 0 ? (
          <p className="text-slate-500 font-bold animate-pulse">Loading missing records…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
            <AlertTriangle className="mx-auto mb-3 text-amber-400" size={48} />
            <p className="font-bold">No missing items recorded</p>
            <p className="text-sm mt-2">Use Report missing when a component is lost from an assigned package.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Parent asset</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Missing item</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Assigned to</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => (
                  <tr key={it['Record ID']} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/assets/${encodeURIComponent(it['Parent Asset ID'])}`)}
                        className="font-bold text-blue-600 hover:underline text-left"
                      >
                        {it['Parent Asset Name'] || it['Parent Asset ID']}
                      </button>
                      <p className="text-[10px] font-mono text-slate-500">#{it['Parent Asset ID']}</p>
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900">{it['Missing Item Name']}</td>
                    <td className="px-4 py-3 text-slate-600">{it['Assigned Person'] || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{it['Missing Date']?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          it.Status === 'Recovered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {it.Status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {it.Status === 'Missing' && (
                        <button
                          type="button"
                          onClick={() => markRecovered(it)}
                          className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 hover:text-emerald-800"
                        >
                          <CheckCircle2 size={14} /> Recovered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MarkMissingModal
        open={modalOpen}
        assets={assets}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void load(true);
        }}
      />
    </div>
  );
}
