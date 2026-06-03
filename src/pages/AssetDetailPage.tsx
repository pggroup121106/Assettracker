import { useEffect, useState } from 'react';
import type { AssignmentHistoryEntry } from '../types/employee';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AssetDetails from '../components/AssetDetails';
import DeleteAssetModal from '../components/DeleteAssetModal';
import { useApp } from '../context/AppProvider';
import { findAssetByRouteId } from '../lib/assetLookup';

export default function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { assets, loading, user, executeDelete } = useApp();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [history, setHistory] = useState<AssignmentHistoryEntry[]>([]);

  const asset = assetId ? findAssetByRouteId(assets, assetId) : undefined;

  useEffect(() => {
    if (!assetId) return;
    fetch(`/api/assets/${encodeURIComponent(assetId)}/history`)
      .then((r) => (r.ok ? r.json() : { history: [] }))
      .then((d) => setHistory(d.history || []))
      .catch(() => setHistory([]));
  }, [assetId]);

  const onDelete = async () => {
    if (!asset?.id) return;
    try {
      await executeDelete(asset.id);
      setDeleteOpen(false);
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (!loading && !asset) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-black text-slate-900">Asset not found</h2>
          <p className="text-sm text-slate-500 mt-2">This asset may have been removed or the link is invalid.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 btn-primary-geometric"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 font-bold animate-pulse">Loading asset details…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 shrink-0">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft size={18} /> Back to assets
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-5xl mx-auto">
          <AssetDetails
            layout="page"
            asset={asset}
            role={user?.role}
            assignmentHistory={history}
            onEdit={(a) => navigate(`/assets/${assetId}/edit`, { state: { asset: a } })}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      <DeleteAssetModal open={deleteOpen} onCancel={() => setDeleteOpen(false)} onConfirm={onDelete} />
    </div>
  );
}
