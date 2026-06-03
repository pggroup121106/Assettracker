import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import type { Asset } from '../types';
import type { MissingItemRecord } from '../types/redesigned';
import { parseJsonResponse } from '../lib/apiFetch';

interface MarkMissingModalProps {
  open: boolean;
  assets: Asset[];
  onClose: () => void;
  onSaved: () => void;
}

export default function MarkMissingModal({ open, assets, onClose, onSaved }: MarkMissingModalProps) {
  const [parentAssetId, setParentAssetId] = useState('');
  const [itemName, setItemName] = useState('');
  const [assignedPerson, setAssignedPerson] = useState('');
  const [missingDate, setMissingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const parent = assets.find((a) => String(a.id) === parentAssetId || a.assetCode === parentAssetId);

  useEffect(() => {
    if (!open) return;
    setParentAssetId('');
    setItemName('');
    setAssignedPerson('');
    setMissingDate(new Date().toISOString().slice(0, 10));
    setRemarks('');
  }, [open]);

  useEffect(() => {
    if (parent) {
      setAssignedPerson(parent.contactName || assignedPerson);
    }
  }, [parent?.id]);

  if (!open) return null;

  const save = async () => {
    if (!parentAssetId.trim() || !itemName.trim()) {
      return toast.error('Select parent asset and missing item name');
    }
    setSaving(true);
    try {
      const row: MissingItemRecord = {
        'Record ID': '',
        'Parent Asset ID': parentAssetId,
        'Parent Asset Name': parent
          ? `${parent.make} ${parent.model}`.trim() || parent.assetName || ''
          : '',
        'Missing Item Name': itemName.trim(),
        'Assigned Person': assignedPerson.trim(),
        'Missing Date': missingDate,
        Status: 'Missing',
        Remarks: remarks.trim(),
        'Recovered Date': '',
        'Recovered By': '',
      };
      const res = await fetch('/api/missing-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: row, syncSheet: true }),
      });
      const data = await parseJsonResponse<{ error?: string; sheetWarning?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.sheetWarning) toast.error(`Saved locally. ${data.sheetWarning}`, { duration: 5000 });
      else toast.success('Missing item recorded');
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900">Report missing item</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Only the component is marked missing — the parent asset (e.g. laptop) stays assigned.
        </p>
        <div className="space-y-4">
          <div>
            <label className="label-caps block mb-1">Parent asset *</label>
            <select
              value={parentAssetId}
              onChange={(e) => setParentAssetId(e.target.value)}
              className="w-full input-geometric bg-white"
            >
              <option value="">Select asset</option>
              {assets.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  #{a.id} — {a.make} {a.model} ({a.contactName || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps block mb-1">Missing item name *</label>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Mouse, Charger, Laptop Bag"
              className="w-full input-geometric"
              list="common-missing-items"
            />
            <datalist id="common-missing-items">
              {['Mouse', 'Keyboard', 'Charger', 'Laptop Bag', 'Headset', 'Monitor', 'Webcam', 'USB Hub', 'Docking Station'].map(
                (n) => (
                  <option key={n} value={n} />
                )
              )}
            </datalist>
          </div>
          <div>
            <label className="label-caps block mb-1">Assigned person</label>
            <input
              value={assignedPerson}
              onChange={(e) => setAssignedPerson(e.target.value)}
              className="w-full input-geometric"
            />
          </div>
          <div>
            <label className="label-caps block mb-1">Missing date</label>
            <input
              type="date"
              value={missingDate}
              onChange={(e) => setMissingDate(e.target.value)}
              className="w-full input-geometric"
            />
          </div>
          <div>
            <label className="label-caps block mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full input-geometric min-h-[72px]"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-8 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary-geometric">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary-geometric bg-amber-600 hover:bg-amber-700">
            {saving ? 'Saving…' : 'Save record'}
          </button>
        </div>
      </div>
    </div>
  );
}
