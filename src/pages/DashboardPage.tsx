import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  Plus,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Package,
  AlertCircle,
  UserCheck,
  Edit2,
  Cpu,
  Sofa,
  Zap,
  Factory,
  ShieldAlert,
  Car,
  Table as TableIcon,
  FileText,
  Building2,
  Wrench,
  MapPin,
  Building,
  Filter,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AssetTable from '../components/AssetTable';
import QRCodeDisplay from '../components/QRCodeDisplay';
import DeleteAssetModal from '../components/DeleteAssetModal';
import { AssetTableSkeleton } from '../components/LoadingSkeleton';
import { APP_NAME } from '../lib/constants';
import { SYNC_DATABASE_MSG, SYNC_DATABASE_OK, SYNC_DATABASE_ERR } from '../lib/uiLabels';
import { assetRouteId } from '../lib/assetLookup';
import { useApp } from '../context/AppProvider';
import type { Asset } from '../types';
import { useInventory } from '../hooks/useInventory';
import type { InventoryItem } from '../types/inventory';
import { EMPTY_INVENTORY_ITEM } from '../types/inventory';
import InventoryModal from '../components/InventoryModal';

const ALL_CATEGORIES = [
  'IT Assets',
  'Office Assets',
  'Electrical Assets',
  'Production Assets',
  'Safety Assets',
  'Vehicle Assets',
  'Furniture Assets',
  'Software / License Assets',
  'Admin / Facility Assets',
  'Maintenance Assets',
  'Inventory',
  'Missing Items',
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'IT Assets': Cpu,
  'Office Assets': Sofa,
  'Electrical Assets': Zap,
  'Production Assets': Factory,
  'Safety Assets': ShieldAlert,
  'Vehicle Assets': Car,
  'Furniture Assets': TableIcon,
  'Software / License Assets': FileText,
  'Admin / Facility Assets': Building2,
  'Maintenance Assets': Wrench,
  'Inventory': Package,
  'Missing Items': AlertCircle,
};

const CATEGORY_STYLES: Record<string, { gradient: string; text: string; iconBg: string; shadow: string; border: string }> = {
  'IT Assets': { gradient: 'from-blue-50 to-indigo-50/30', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-700', shadow: 'hover:shadow-blue-500/5', border: 'border-blue-100' },
  'Office Assets': { gradient: 'from-orange-50 to-amber-50/30', text: 'text-orange-700', iconBg: 'bg-orange-100 text-orange-700', shadow: 'hover:shadow-orange-500/5', border: 'border-orange-100' },
  'Electrical Assets': { gradient: 'from-amber-50 to-yellow-50/30', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-700', shadow: 'hover:shadow-amber-500/5', border: 'border-amber-100' },
  'Production Assets': { gradient: 'from-purple-50 to-violet-50/30', text: 'text-purple-700', iconBg: 'bg-purple-100 text-purple-700', shadow: 'hover:shadow-purple-500/5', border: 'border-purple-100' },
  'Safety Assets': { gradient: 'from-rose-50 to-red-50/30', text: 'text-rose-700', iconBg: 'bg-rose-100 text-rose-700', shadow: 'hover:shadow-rose-500/5', border: 'border-rose-100' },
  'Vehicle Assets': { gradient: 'from-emerald-50 to-teal-50/30', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-700', shadow: 'hover:shadow-emerald-500/5', border: 'border-emerald-100' },
  'Furniture Assets': { gradient: 'from-amber-50 to-yellow-50/10', text: 'text-amber-800', iconBg: 'bg-amber-100 text-amber-800', shadow: 'hover:shadow-amber-700/5', border: 'border-amber-200' },
  'Software / License Assets': { gradient: 'from-fuchsia-50 to-pink-50/30', text: 'text-fuchsia-700', iconBg: 'bg-fuchsia-100 text-fuchsia-700', shadow: 'hover:shadow-fuchsia-500/5', border: 'border-fuchsia-100' },
  'Admin / Facility Assets': { gradient: 'from-sky-50 to-blue-50/30', text: 'text-sky-700', iconBg: 'bg-sky-100 text-sky-700', shadow: 'hover:shadow-sky-500/5', border: 'border-sky-100' },
  'Maintenance Assets': { gradient: 'from-slate-50 to-slate-100/30', text: 'text-slate-700', iconBg: 'bg-slate-200/60 text-slate-700', shadow: 'hover:shadow-slate-500/5', border: 'border-slate-200' },
  'Inventory': { gradient: 'from-teal-50 to-emerald-50/30', text: 'text-teal-700', iconBg: 'bg-teal-100 text-teal-700', shadow: 'hover:shadow-teal-500/5', border: 'border-teal-100' },
  'Missing Items': { gradient: 'from-rose-50 to-red-50/30', text: 'text-rose-700', iconBg: 'bg-rose-100 text-rose-700', shadow: 'hover:shadow-rose-500/5', border: 'border-rose-100' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, assets, loading, visibleCategories, fetchAssets, filterAssets, executeDelete } =
    useApp();

  const selectedCategory = searchParams.get('category') || 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingQR, setViewingQR] = useState<Asset | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings Locations/Plants states
  const [locations, setLocations] = useState<string[]>([]);
  const [plants, setPlants] = useState<{ code: string; name: string; location: string }[]>([]);

  // Advanced Filters
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Inventory Tab Integration
  const [activeTab, setActiveTab] = useState<'assets' | 'inventory'>('assets');
  const { inventory, loading: inventoryLoading, refresh: refreshInventory } = useInventory();
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState<InventoryItem>(EMPTY_INVENTORY_ITEM());
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null);

  const isAdmin = user?.role === 'IT Admin' || user?.role === 'Admin';

  useEffect(() => {
    fetch((import.meta.env.VITE_API_BASE_URL || "") + '/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setLocations(data.locations || []);
        setPlants(data.plants || []);
      })
      .catch(() => {});
  }, []);

  const openAddInventory = () => {
    setInventoryForm({
      ...EMPTY_INVENTORY_ITEM(),
      category: selectedCategory === 'All' ? 'IT Assets' : selectedCategory,
    });
    setInventoryModalOpen(true);
  };

  const openEditInventory = (item: InventoryItem) => {
    setInventoryForm({ ...item });
    setInventoryModalOpen(true);
  };

  const executeDeleteInventory = async (itemId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/inventory/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Inventory item deleted');
      setDeletingInventoryId(null);
      await refreshInventory(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  useEffect(() => {
    setActiveTab('assets');
    setSelectedStatus('All');
  }, [selectedCategory]);

  useEffect(() => {
    setSelectedStatus('All');
  }, [activeTab]);

  useEffect(() => {
    if (
      user &&
      user.role !== 'IT Admin' &&
      user.categories &&
      user.categories.length > 0 &&
      !user.categories.includes('All')
    ) {
      const cats = visibleCategories;
      if (cats.length > 0 && (selectedCategory === 'All' || !cats.includes(selectedCategory))) {
        setSearchParams({ category: cats[0] }, { replace: true });
      }
    }
  }, [user, visibleCategories, selectedCategory, setSearchParams]);

  const filteredAssets = useMemo(
    () => filterAssets(assets, { searchQuery, selectedCategory }),
    [assets, searchQuery, selectedCategory, filterAssets]
  );

  const displayAssets = useMemo(() => {
    let list = filteredAssets;

    // Filter by Location
    if (selectedLocation !== 'All') {
      list = list.filter((a) => a.location === selectedLocation);
    }

    // Filter by Plant
    if (selectedPlant !== 'All') {
      list = list.filter((a) => a.plantCode === selectedPlant);
    }

    // Filter by Status / assetFilter
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Assigned') {
        list = list.filter((a) => a.status === 'Assigned' || a.status === 'In Use');
      } else if (selectedStatus === 'Available') {
        list = list.filter((a) => !a.status || a.status === 'Available');
      } else if (selectedStatus === 'Maintenance') {
        list = list.filter((a) => a.status === 'Under Maintenance' || a.maintenanceRequired === 'Yes');
      } else if (selectedStatus === 'Damaged') {
        list = list.filter((a) => a.status === 'Damaged' || a.status === 'Scrap');
      } else if (selectedStatus === 'Lost') {
        list = list.filter((a) => a.status === 'Lost');
      } else {
        list = list.filter((a) => a.status === selectedStatus);
      }
    }
    return list;
  }, [filteredAssets, selectedLocation, selectedPlant, selectedStatus]);

  const categoryInventory = useMemo(() => {
    return inventory.filter((item) => item.category === selectedCategory);
  }, [inventory, selectedCategory]);

  const searchFilteredCategoryInventory = useMemo(() => {
    let list = categoryInventory;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (item) =>
          item.itemId.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          item.brandName.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          item.serialNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [categoryInventory, searchQuery]);

  const filteredCategoryInventory = useMemo(() => {
    let list = searchFilteredCategoryInventory;
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Available') {
        list = list.filter((item) => item.status === 'Available');
      } else if (selectedStatus === 'Assigned') {
        list = list.filter((item) => item.status === 'Assigned');
      } else if (selectedStatus === 'Missing') {
        list = list.filter((item) => item.status === 'Missing');
      } else if (selectedStatus === 'Damaged') {
        list = list.filter((item) => item.status === 'Damaged');
      } else if (selectedStatus === 'LowStock') {
        list = list.filter((item) => item.quantity <= item.minStock);
      }
    }
    return list;
  }, [searchFilteredCategoryInventory, selectedStatus]);

  const inventoryStats = useMemo(() => {
    let totalItems = 0;
    let availableStock = 0;
    let assignedItems = 0;
    let missingItems = 0;
    let damagedItems = 0;
    let lowStockItems = 0;

    searchFilteredCategoryInventory.forEach((item) => {
      totalItems += item.quantity;
      if (item.status === 'Available') {
        availableStock += item.quantity;
      } else if (item.status === 'Assigned') {
        assignedItems += item.quantity;
      } else if (item.status === 'Missing') {
        missingItems += item.quantity;
      } else if (item.status === 'Damaged') {
        damagedItems += item.quantity;
      }

      if (item.quantity <= item.minStock) {
        lowStockItems++;
      }
    });

    return {
      totalItems,
      availableStock,
      assignedItems,
      missingItems,
      damagedItems,
      lowStockItems,
    };
  }, [searchFilteredCategoryInventory]);

  const exportToExcel = () => {
    try {
      const targetAssets =
        user && user.role !== 'IT Admin' ? filteredAssets : assets;
      const ws = XLSX.utils.json_to_sheet(targetAssets);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assets');
      XLSX.writeFile(wb, `AssetVault_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      toast.success(`Found ${json.length} records. Importing...`);
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + '/api/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: json }),
      });
      if (!res.ok) throw new Error('Import failed');
      toast.success('Import complete!');
      fetchAssets();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const onDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;
    try {
      await executeDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const plantsFiltered = useMemo(() => {
    return selectedLocation === 'All' ? plants : plants.filter(p => p.location === selectedLocation);
  }, [plants, selectedLocation]);

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] sm:text-xs font-black rounded-xl tracking-wide shadow-md shrink-0 max-w-[140px] sm:max-w-none truncate">
            {APP_NAME}
          </span>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'assets' ? 'Search assets...' : 'Search inventory...'}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'assets' ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  toast.promise(fetchAssets({ force: true }), {
                    loading: SYNC_DATABASE_MSG,
                    success: SYNC_DATABASE_OK,
                    error: SYNC_DATABASE_ERR,
                  }, { id: 'sync-assets' });
                }}
                className={`px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Database
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Download size={14} /> Export
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Upload size={14} /> Import
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => navigate('/assets/new')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> New Asset
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={inventoryLoading}
                onClick={() => {
                  toast.promise(refreshInventory(true), {
                    loading: SYNC_DATABASE_MSG,
                    success: SYNC_DATABASE_OK,
                    error: SYNC_DATABASE_ERR,
                  }, { id: 'sync-inventory' });
                }}
                className={`px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${inventoryLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              >
                <RefreshCw size={14} className={inventoryLoading ? 'animate-spin' : ''} /> Sync Sheets
              </button>
              <button
                type="button"
                onClick={openAddInventory}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> Add Stock
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 lg:px-8 pb-6 lg:pb-8 pt-0 bg-slate-50/50">
        <div className="mb-6 flex flex-wrap justify-between items-end gap-4 pt-6 lg:pt-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
              {selectedCategory === 'All'
                ? `${APP_NAME} — Enterprise Overview`
                : `${APP_NAME} — ${selectedCategory}`}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {selectedCategory === 'All'
                ? `${assets.length} total assets registered`
                : activeTab === 'assets'
                ? `${filteredAssets.length} assets in category`
                : `${filteredCategoryInventory.length} inventory items in category`}
            </p>
          </div>
          {selectedCategory !== 'All' &&
            !(
              user &&
              user.role !== 'IT Admin' &&
              user.categories &&
              user.categories.length > 0 &&
              !user.categories.includes('All')
            ) && (
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl uppercase tracking-wider transition-colors shadow-sm"
              >
                ← View All Categories
              </button>
            )}
        </div>

        {/* Sticky Small Stats Cards */}
        <div className="sticky top-0 z-30 bg-white py-4 mb-6 border-b border-slate-200 shadow-sm -mx-6 lg:-mx-8 px-6 lg:px-8">
          {activeTab === 'assets' ? (
            /* Quick Stats Summary Grid (Assets) */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div 
                onClick={() => setSelectedStatus('All')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm ${selectedStatus === 'All' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-200'}`}
              >
                <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'All' ? 'text-slate-600' : 'text-slate-400'}`}>Total Assets</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{filteredAssets.length}</h3>
              </div>
              
              <div 
                onClick={() => setSelectedStatus('Assigned')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between ${selectedStatus === 'Assigned' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}
              >
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Assigned' ? 'text-blue-600' : 'text-slate-400'}`}>Assigned / In Use</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-1">
                    {filteredAssets.filter((a) => a.status === 'Assigned' || a.status === 'In Use').length}
                  </h3>
                </div>
                <CheckCircle2 className={`w-8 h-8 shrink-0 ${selectedStatus === 'Assigned' ? 'text-blue-500' : 'text-blue-100'}`} />
              </div>
              
              <div 
                onClick={() => setSelectedStatus('Available')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between ${selectedStatus === 'Available' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'}`}
              >
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Available' ? 'text-emerald-600' : 'text-slate-400'}`}>Available</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">
                    {filteredAssets.filter((a) => !a.status || a.status === 'Available').length}
                  </h3>
                </div>
                <CheckCircle className={`w-8 h-8 shrink-0 ${selectedStatus === 'Available' ? 'text-emerald-500' : 'text-emerald-100'}`} />
              </div>
              
              <div 
                onClick={() => setSelectedStatus('Maintenance')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between ${selectedStatus === 'Maintenance' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'}`}
              >
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Maintenance' ? 'text-amber-600' : 'text-slate-400'}`}>Maintenance</p>
                  <h3 className="text-2xl font-black text-amber-600 mt-1">
                    {filteredAssets.filter((a) => a.status === 'Under Maintenance' || a.maintenanceRequired === 'Yes').length}
                  </h3>
                </div>
                <AlertTriangle className={`w-8 h-8 shrink-0 ${selectedStatus === 'Maintenance' ? 'text-amber-500' : 'text-amber-100'}`} />
              </div>
              
              <div 
                onClick={() => setSelectedStatus('Damaged')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between ${selectedStatus === 'Damaged' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'}`}
              >
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Damaged' ? 'text-red-600' : 'text-slate-400'}`}>Damaged / Scrap</p>
                  <h3 className="text-2xl font-black text-red-600 mt-1">
                    {filteredAssets.filter((a) => a.status === 'Damaged' || a.status === 'Scrap').length}
                  </h3>
                </div>
                <Trash2 className={`w-8 h-8 shrink-0 ${selectedStatus === 'Damaged' ? 'text-red-500' : 'text-red-100'}`} />
              </div>
              
              <div 
                onClick={() => setSelectedStatus('Lost')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between text-left ${selectedStatus === 'Lost' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'}`}
              >
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Missing items</p>
                  <h3 className="text-2xl font-black text-amber-700 mt-1">
                    {filteredAssets.filter((a) => a.status === 'Lost').length}
                  </h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/missing'); }} 
                    className="text-[9px] text-amber-600/80 mt-1 font-bold hover:text-amber-800 transition-colors"
                  >
                    View component tracking →
                  </button>
                </div>
                <AlertCircle className={`w-8 h-8 shrink-0 ${selectedStatus === 'Lost' ? 'text-amber-500' : 'text-amber-100'}`} />
              </div>
            </div>
          ) : (
            /* Inventory Dashboard Stats */
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div 
                onClick={() => setSelectedStatus('All')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm ${selectedStatus === 'All' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'All' ? 'text-slate-600' : 'text-slate-400'}`}>Total Items</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{inventoryStats.totalItems}</h3>
                  </div>
                  <Package className={`w-6 h-6 shrink-0 ${selectedStatus === 'All' ? 'text-slate-700' : 'text-slate-400'}`} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedStatus('Available')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm ${selectedStatus === 'Available' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Available' ? 'text-emerald-600' : 'text-slate-400'}`}>Available Stock</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{inventoryStats.availableStock}</h3>
                  </div>
                  <CheckCircle className={`w-6 h-6 shrink-0 ${selectedStatus === 'Available' ? 'text-emerald-500' : 'text-emerald-100'}`} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedStatus('Assigned')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm ${selectedStatus === 'Assigned' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Assigned' ? 'text-blue-600' : 'text-slate-400'}`}>Assigned Items</p>
                    <h3 className="text-2xl font-black text-blue-600 mt-1">{inventoryStats.assignedItems}</h3>
                  </div>
                  <UserCheck className={`w-6 h-6 shrink-0 ${selectedStatus === 'Assigned' ? 'text-blue-500' : 'text-blue-100'}`} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedStatus('Missing')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm ${selectedStatus === 'Missing' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Missing' ? 'text-amber-600' : 'text-slate-400'}`}>Missing Items</p>
                    <h3 className="text-2xl font-black text-amber-600 mt-1">{inventoryStats.missingItems}</h3>
                  </div>
                  <AlertCircle className={`w-6 h-6 shrink-0 ${selectedStatus === 'Missing' ? 'text-amber-500' : 'text-amber-100'}`} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedStatus('Damaged')}
                className={`cursor-pointer transition-all hover:scale-[1.02] bg-white border rounded-2xl p-5 shadow-sm ${selectedStatus === 'Damaged' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'Damaged' ? 'text-red-600' : 'text-slate-400'}`}>Damaged Items</p>
                    <h3 className="text-2xl font-black text-red-600 mt-1">{inventoryStats.damagedItems}</h3>
                  </div>
                  <Trash2 className={`w-6 h-6 shrink-0 ${selectedStatus === 'Damaged' ? 'text-red-500' : 'text-red-150'}`} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedStatus('LowStock')}
                className={`cursor-pointer transition-all hover:scale-[1.02] p-5 shadow-sm border rounded-2xl ${selectedStatus === 'LowStock' ? 'border-rose-500 ring-2 ring-rose-500/20' : inventoryStats.lowStockItems > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStatus === 'LowStock' ? 'text-rose-600' : 'text-slate-400'}`}>Low Stock Alerts</p>
                    <h3 className={`text-2xl font-black mt-1 ${selectedStatus === 'LowStock' ? 'text-rose-700' : inventoryStats.lowStockItems > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{inventoryStats.lowStockItems}</h3>
                  </div>
                  <AlertTriangle className={`w-6 h-6 shrink-0 ${selectedStatus === 'LowStock' ? 'text-rose-500' : inventoryStats.lowStockItems > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Categories Dynamic Overview Grid (Visible when category is 'All') */}
        {selectedCategory === 'All' && (
          <div className="mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Layers size={14} /> Category Inventory Summary
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="h-6 bg-slate-150 rounded" />
                      <div className="h-6 bg-slate-150 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ALL_CATEGORIES.filter(cat => 
                  cat === 'Inventory' || cat === 'Missing Items' || visibleCategories.includes(cat)
                ).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] || Cpu;
                  const style = CATEGORY_STYLES[cat] || {
                    gradient: 'from-slate-50 to-slate-100',
                    text: 'text-slate-700',
                    iconBg: 'bg-slate-100 text-slate-700',
                    shadow: 'hover:shadow-slate-500/5',
                    border: 'border-slate-200'
                  };

                  let total = 0;
                  let available = 0;
                  let assigned = 0;
                  let repair = 0;
                  let lost = 0;

                  if (cat === 'Inventory') {
                    total = inventory.reduce((sum, item) => sum + item.quantity, 0);
                    available = inventory.filter(item => item.status === 'Available').reduce((sum, item) => sum + item.quantity, 0);
                    assigned = inventory.filter(item => item.status === 'Assigned').reduce((sum, item) => sum + item.quantity, 0);
                    repair = inventory.filter(item => item.status === 'Damaged').reduce((sum, item) => sum + item.quantity, 0);
                    lost = inventory.filter(item => item.status === 'Missing').reduce((sum, item) => sum + item.quantity, 0);
                  } else if (cat === 'Missing Items') {
                    const lostAssets = assets.filter(a => a.status === 'Lost');
                    total = lostAssets.length;
                    available = lostAssets.filter(a => (a.mainCategory || 'IT Assets') === 'IT Assets').length;
                    assigned = lostAssets.filter(a => (a.mainCategory || 'IT Assets') === 'Office Assets').length;
                    repair = lostAssets.filter(a => (a.mainCategory || 'IT Assets') === 'Electrical Assets').length;
                    lost = lostAssets.filter(a => !['IT Assets', 'Office Assets', 'Electrical Assets'].includes(a.mainCategory || '')).length;
                  } else {
                    const catAssets = assets.filter(a => {
                      const matchCat = (a.mainCategory || 'IT Assets') === cat;
                      const matchLoc = selectedLocation === 'All' || a.location === selectedLocation;
                      const matchPlant = selectedPlant === 'All' || a.plantCode === selectedPlant;
                      return matchCat && matchLoc && matchPlant;
                    });

                    total = catAssets.length;
                    available = catAssets.filter(a => !a.status || a.status === 'Available').length;
                    assigned = catAssets.filter(a => a.status === 'Assigned' || a.status === 'In Use').length;
                    const damaged = catAssets.filter(a => a.status === 'Damaged' || a.status === 'Scrap').length;
                    const maintenance = catAssets.filter(a => a.status === 'Under Maintenance' || a.maintenanceRequired === 'Yes').length;
                    repair = damaged + maintenance;
                    lost = catAssets.filter(a => a.status === 'Lost').length;
                  }

                  const handleClick = () => {
                    if (cat === 'Inventory') {
                      navigate('/inventory');
                    } else if (cat === 'Missing Items') {
                      navigate('/missing');
                    } else {
                      setSearchParams({ category: cat });
                    }
                  };

                  return (
                    <div
                      key={cat}
                      onClick={handleClick}
                      className={`cursor-pointer bg-white border ${style.border} rounded-2xl p-5 hover:scale-[1.01] hover:shadow-xl ${style.shadow} transition-all duration-300 group flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center font-bold`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                              {cat}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                              {cat === 'Inventory' ? 'Items' : cat === 'Missing Items' ? 'Assets' : 'Registered'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-lg font-black ${style.text} bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 font-mono`}>
                          {total}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-emerald-50/50 border border-emerald-100/50 px-2 py-1 rounded-lg">
                          <span className="text-slate-400 block font-sans">
                            {cat === 'Missing Items' ? 'IT Assets' : 'Available'}
                          </span>
                          <span className="text-emerald-700 font-bold text-xs">{available}</span>
                        </div>
                        <div className="bg-blue-50/50 border border-blue-100/50 px-2 py-1 rounded-lg">
                          <span className="text-slate-400 block font-sans">
                            {cat === 'Missing Items' ? 'Office Assets' : 'Assigned'}
                          </span>
                          <span className="text-blue-700 font-bold text-xs">{assigned}</span>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-100/50 px-2 py-1 rounded-lg">
                          <span className="text-slate-400 block font-sans">
                            {cat === 'Missing Items' ? 'Electrical' : 'Repair/Maint'}
                          </span>
                          <span className="text-amber-700 font-bold text-xs">{repair}</span>
                        </div>
                        <div className="bg-rose-50/50 border border-rose-100/50 px-2 py-1 rounded-lg">
                          <span className="text-slate-400 block font-sans">
                            {cat === 'Missing Items' ? 'Other Assets' : 'Missing'}
                          </span>
                          <span className="text-rose-700 font-bold text-xs">{lost}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedCategory !== 'All' && (
          <div className="flex border-b border-slate-200 mb-6 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'assets'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Assets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'inventory'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Inventory
            </button>
          </div>
        )}

        {activeTab === 'assets' ? (
          <>
            {/* Advanced Filters Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center justify-between font-sans">
              <div className="flex flex-wrap gap-4 items-center flex-1">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <Filter size={14} className="text-blue-500" /> Filters
                </div>
                
                {/* Location Filter */}
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <span className="text-[9px] uppercase font-black text-slate-400">Location</span>
                  <select
                    value={selectedLocation}
                    onChange={(e) => {
                      setSelectedLocation(e.target.value);
                      setSelectedPlant('All');
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="All">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Plant Filter */}
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <span className="text-[9px] uppercase font-black text-slate-400">Plant / Plant Code</span>
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="All">All Plants</option>
                    {plantsFiltered.map((p) => (
                      <option key={p.code} value={p.code}>{p.code} · {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <span className="text-[9px] uppercase font-black text-slate-400">Status</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Assigned">Assigned / In Use</option>
                    <option value="Maintenance">Under Maintenance</option>
                    <option value="Damaged">Damaged / Scrap</option>
                    <option value="Lost">Lost / Missing</option>
                  </select>
                </div>
              </div>

              {/* Clear filters trigger */}
              {(selectedLocation !== 'All' || selectedPlant !== 'All' || selectedStatus !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation('All');
                    setSelectedPlant('All');
                    setSelectedStatus('All');
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                >
                  Clear Filters
                </button>
              )}
            </div>



            {loading && assets.length === 0 ? (
              <AssetTableSkeleton />
            ) : (
              <AssetTable
                assets={displayAssets}
                onEdit={(a) => navigate(`/assets/${assetRouteId(a)}/edit`)}
                onDelete={(id) => setDeleteConfirmId(id)}
                onViewQR={setViewingQR}
                onViewAsset={(a) => navigate(`/assets/${assetRouteId(a)}`)}
                role={user?.role}
                allowDelete={user?.allowDelete}
              />
            )}
          </>
        ) : (
          <>


            {/* Inventory Table */}
            {inventoryLoading && filteredCategoryInventory.length === 0 ? (
              <p className="text-slate-500 font-bold animate-pulse">Loading stock levels...</p>
            ) : filteredCategoryInventory.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <Package className="mx-auto mb-3 opacity-30 text-slate-500" size={48} />
                <p className="font-bold text-slate-700">No inventory items found in this category</p>
                <button type="button" onClick={openAddInventory} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20">
                  Add First Stock Item
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Item ID</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Item Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Brand / Model</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Serial Number</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Quantity</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategoryInventory.map((item) => {
                      const isLowStock = item.quantity <= item.minStock;
                      return (
                        <tr key={item.itemId} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono text-sm font-bold text-blue-700">{item.itemId}</td>
                          <td className="px-6 py-4 font-black text-slate-900 text-sm">{item.itemName}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {item.brandName} {item.model ? `· ${item.model}` : ''}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.serialNumber || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black ${
                              isLowStock ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-700'
                            }`}>
                              {item.quantity} {isLowStock ? ' (Low)' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              item.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              item.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              item.status === 'Damaged' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditInventory(item)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingInventoryId(item.itemId)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {viewingQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
            >
              <QRCodeDisplay asset={viewingQR} onClose={() => setViewingQR(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteAssetModal
        open={deleteConfirmId !== null}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={onDeleteConfirm}
      />

      <InventoryModal
        open={inventoryModalOpen}
        initial={inventoryForm}
        onClose={() => setInventoryModalOpen(false)}
        onSaved={async () => {
          await refreshInventory(true);
        }}
      />

      {/* Delete Inventory Confirmation Modal */}
      {deletingInventoryId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Inventory Item</h3>
            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to delete item <b>{deletingInventoryId}</b> from inventory? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingInventoryId(null)}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDeleteInventory(deletingInventoryId)}
                className="px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
