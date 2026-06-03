import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus, Search, User, RefreshCw } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useApp } from '../context/AppProvider';
import { assetsForEmployee } from '../lib/employeeAssets';
import type { Employee } from '../types/employee';
import { EMPTY_EMPLOYEE } from '../types/employee';
import CreateEmployeeModal from '../components/CreateEmployeeModal';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, assets } = useApp();
  const { employees, loading, refresh } = useEmployees();

  const isAdmin = user?.role === 'IT Admin' || user?.role === 'Admin';
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Employee>(EMPTY_EMPLOYEE());
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      try {
        const draft = sessionStorage.getItem('assestflow_new_employee_draft');
        if (draft) {
          setForm(JSON.parse(draft) as Employee);
          sessionStorage.removeItem('assestflow_new_employee_draft');
        }
      } catch {
        /* ignore */
      }
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e) => {
      const matchesEmployee =
        e.employeeId.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      if (matchesEmployee) return true;

      // Find if any asset assigned to this employee matches the query as asset ID/code
      const empAssets = assetsForEmployee(assets, e);
      return empAssets.some(
        (a) =>
          String(a.id).toLowerCase().includes(q) ||
          (a.assetCode && a.assetCode.toLowerCase().includes(q)) ||
          (a.uniqueCode && a.uniqueCode.toLowerCase().includes(q))
      );
    });
  }, [employees, search, assets]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 lg:px-8 py-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employees</h1>
            <p className="text-sm text-slate-500 mt-1">Directory &amp; asset assignments by employee</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                toast.promise(refresh(true), {
                  loading: 'Syncing employees...',
                  success: 'Sync complete',
                  error: 'Sync failed'
                }, { id: 'sync-employees' });
              }}
              className={`px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_EMPLOYEE());
                setModalOpen(true);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2"
            >
              <Plus size={16} /> Add employee
            </button>
          </div>
        </div>
        <div className="mt-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, email, department…"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {loading && employees.length === 0 ? (
          <p className="text-slate-500 font-bold animate-pulse">Loading employees…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <User className="mx-auto mb-3 opacity-40" size={48} />
            <p className="font-bold">No employees found</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Employee ID</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Department</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Email</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Assets</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => {
                  const count = assetsForEmployee(assets, emp).length;
                  return (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/employees/${encodeURIComponent(emp.employeeId)}`)}
                    >
                      <td className="px-6 py-4 font-mono text-sm font-bold text-blue-700">{emp.employeeId}</td>
                      <td className="px-6 py-4 font-black text-slate-900 text-sm">{emp.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.department || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-black">
                          {count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateEmployeeModal
        open={modalOpen}
        initial={form}
        onClose={() => setModalOpen(false)}
        onSaved={async (emp) => {
          setModalOpen(false);
          setForm(EMPTY_EMPLOYEE());
          await refresh(true);
          navigate(`/employees/${encodeURIComponent(emp.employeeId)}`);
        }}
      />
    </div>
  );
}
