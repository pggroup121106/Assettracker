import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Search, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '../types/employee';
import CreateEmployeeModal from './CreateEmployeeModal';
import { parseJsonResponse } from '../lib/apiFetch';

export interface EmployeeAssignmentValues {
  employeeId: string;
  contactName: string;
  contactEmail: string;
  contactMobile: string;
  department: string;
  location: string;
  plantCode: string;
}

interface EmployeeSelectorProps {
  values: EmployeeAssignmentValues;
  onChange: (patch: Partial<EmployeeAssignmentValues>) => void;
  onEmployeeResolved?: (employee: Employee | null) => void;
}

function normId(id: string) {
  return id.trim().toUpperCase();
}

function canCreateProfile(values: EmployeeAssignmentValues) {
  return !!(values.employeeId?.trim() && values.contactName?.trim() && values.contactEmail?.trim());
}

export default function EmployeeSelector({ values, onChange, onEmployeeResolved }: EmployeeSelectorProps) {
  const navigate = useNavigate();
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matched, setMatched] = useState<Employee | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipLookupRef = useRef(false);

  const applyEmployee = (emp: Employee, count: number | null = null) => {
    setMatched(emp);
    setNotFound(false);
    setAssetCount(count);
    onChange({
      employeeId: emp.employeeId,
      contactName: emp.name,
      contactEmail: emp.email,
      contactMobile: emp.phone || values.contactMobile,
      department: emp.department || values.department,
      location: emp.location || values.location,
      plantCode: emp.plant || values.plantCode,
    });
    onEmployeeResolved?.(emp);
  };

  const lookup = async (employeeId: string, email: string) => {
    if (skipLookupRef.current) {
      skipLookupRef.current = false;
      return;
    }

    const id = normId(employeeId);
    const em = email.trim().toLowerCase();
    if (!id && !em) {
      setMatched(null);
      setNotFound(false);
      setAssetCount(null);
      onEmployeeResolved?.(null);
      return;
    }

    setLookupLoading(true);
    try {
      const params = new URLSearchParams();
      if (id) params.set('employeeId', id);
      if (em) params.set('email', em);
      const res = await fetch(`/api/employees/lookup?${params}`);
      const data = await parseJsonResponse<{ employee?: Employee; assetCount?: number }>(res);
      if (data.employee) {
        applyEmployee(data.employee as Employee, typeof data.assetCount === 'number' ? data.assetCount : null);
      } else {
        setMatched(null);
        setNotFound(true);
        setAssetCount(null);
        onEmployeeResolved?.(null);
      }
    } catch {
      setMatched(null);
      onEmployeeResolved?.(null);
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void lookup(values.employeeId || '', values.contactEmail || '');
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [values.employeeId, values.contactEmail]);

  const draftFromForm = (): Partial<Employee> => ({
    employeeId: normId(values.employeeId) || '',
    name: values.contactName,
    email: values.contactEmail,
    phone: values.contactMobile,
    department: values.department,
    location: values.location,
    plant: values.plantCode,
  });

  const onProfileCreated = (emp: Employee) => {
    skipLookupRef.current = true;
    applyEmployee(emp, 0);
    toast.success('Profile ready — view it anytime under Employees', { icon: '✓' });
  };

  const openCreateModal = () => {
    if (!canCreateProfile(values)) {
      return toast.error('Enter Employee ID, name and email first');
    }
    setCreateModalOpen(true);
  };

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-blue-800">Employee mapping</h4>
          <div className="flex items-center gap-2">
            {lookupLoading && (
              <span className="text-[10px] font-bold text-blue-600 animate-pulse">Looking up…</span>
            )}
            {canCreateProfile(values) && !matched && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-lg"
              >
                <UserPlus size={12} /> Create profile
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label-caps">Employee ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="employeeId"
                value={values.employeeId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (matched && normId(val) !== normId(matched.employeeId)) {
                    setMatched(null);
                    setNotFound(false);
                    setAssetCount(null);
                    onEmployeeResolved?.(null);
                    onChange({
                      employeeId: val,
                      contactName: '',
                      contactEmail: '', // Clear email to avoid conflict
                      contactMobile: '',
                      department: '',
                      location: '',
                      plantCode: '',
                    });
                  } else if (!val.trim()) {
                    setMatched(null);
                    setNotFound(false);
                    setAssetCount(null);
                    onEmployeeResolved?.(null);
                    onChange({
                      employeeId: '',
                      contactName: '',
                      contactEmail: '', // Clear email as well
                      contactMobile: '',
                      department: '',
                      location: '',
                      plantCode: '',
                    });
                  } else {
                    onChange({ employeeId: val });
                  }
                }}
                placeholder="e.g. PGTL001"
                className="w-full input-geometric pl-10 uppercase"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label-caps">Corporate email (lookup)</label>
            <input
              type="email"
              name="contactEmail"
              value={values.contactEmail}
              onChange={(e) => {
                const val = e.target.value;
                if (matched && val.trim().toLowerCase() !== (matched.email || '').trim().toLowerCase()) {
                  setMatched(null);
                  setNotFound(false);
                  setAssetCount(null);
                  onEmployeeResolved?.(null);
                  onChange({
                    contactEmail: val,
                    employeeId: '', // Clear ID to avoid conflict
                    contactName: '',
                    contactMobile: '',
                    department: '',
                    location: '',
                    plantCode: '',
                  });
                } else if (!val.trim()) {
                  setMatched(null);
                  setNotFound(false);
                  setAssetCount(null);
                  onEmployeeResolved?.(null);
                  onChange({
                    contactEmail: '',
                    employeeId: '', // Clear ID as well
                    contactName: '',
                    contactMobile: '',
                    department: '',
                    location: '',
                    plantCode: '',
                  });
                } else {
                  onChange({ contactEmail: val });
                }
              }}
              placeholder="name@company.com"
              className="w-full input-geometric"
            />
          </div>
        </div>

        {matched && (
          <div className="flex flex-wrap items-start gap-3 p-4 bg-white rounded-xl border border-emerald-200">
            <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase text-emerald-600">Profile linked</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900">{matched.name}</p>
                {matched.status === 'Inactive' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-200">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {matched.department} · {matched.designation || '—'} · {matched.plant || '—'}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1">{matched.email}</p>
              {assetCount !== null && (
                <p className="text-xs font-bold text-blue-600 mt-2">
                  Currently has {assetCount} asset{assetCount === 1 ? '' : 's'} assigned
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/employees/${encodeURIComponent(matched.employeeId)}`)}
              className="inline-flex items-center gap-1 text-xs font-black uppercase text-blue-600 hover:text-blue-800"
            >
              Open profile <ExternalLink size={12} />
            </button>
          </div>
        )}

        {notFound && (values.employeeId?.trim() || values.contactEmail?.trim()) && !lookupLoading && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <p className="text-sm text-amber-950 font-semibold flex-1">
                Employee code not found. Please enter employee details manually.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase rounded-lg"
            >
              <UserPlus size={14} /> Create employee profile
            </button>
          </div>
        )}

        {!matched && canCreateProfile(values) && !notFound && !lookupLoading && (
          <p className="text-xs text-slate-600 bg-white/80 rounded-lg px-3 py-2 border border-slate-200">
            Tip: Click <strong>Create profile</strong> to save this person in Employees before registering the asset.
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-blue-100">
          <div className="space-y-1.5">
            <label className="label-caps">Assignee full name *</label>
            <input
              required
              name="contactName"
              value={values.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
              className="w-full input-geometric bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="label-caps">Contact number *</label>
            <input
              required
              name="contactMobile"
              value={values.contactMobile}
              onChange={(e) => onChange({ contactMobile: e.target.value })}
              className="w-full input-geometric bg-white"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="label-caps">Department</label>
            <input
              name="department"
              value={values.department}
              onChange={(e) => onChange({ department: e.target.value })}
              className="w-full input-geometric bg-white"
            />
          </div>
        </div>
      </div>

      <CreateEmployeeModal
        open={createModalOpen}
        initial={draftFromForm()}
        onClose={() => setCreateModalOpen(false)}
        onSaved={onProfileCreated}
      />
    </>
  );
}
