import { useState, useMemo, useEffect } from "react";
import { Edit2, Trash2, QrCode, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import DeviceThumb from "./DeviceThumb";
import { Asset } from "../types";

interface AssetTableProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: number) => void;
  onViewQR: (asset: Asset) => void;
  role?: string;
  allowDelete?: boolean;
}

type SortField = 'id' | 'assetName' | 'location' | 'contactName' | 'status' | 'mainCategory';

export default function AssetTable({ assets, onEdit, onDelete, onViewQR, onViewAsset, role, allowDelete }: AssetTableProps) {
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [assets.length]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'id') {
        aVal = parseInt(String(a.id || 0), 10);
        bVal = parseInt(String(b.id || 0), 10);
      } else if (sortField === 'assetName') {
        aVal = (a.assetName || `${a.make || ''} ${a.model || ''}`).trim().toLowerCase();
        bVal = (b.assetName || `${b.make || ''} ${b.model || ''}`).trim().toLowerCase();
      } else if (sortField === 'location') {
        aVal = (a.location || '').trim().toLowerCase();
        bVal = (b.location || '').trim().toLowerCase();
      } else if (sortField === 'contactName') {
        aVal = (a.contactName || '').trim().toLowerCase();
        bVal = (b.contactName || '').trim().toLowerCase();
      } else if (sortField === 'status') {
        aVal = (a.status || 'Available').trim().toLowerCase();
        bVal = (b.status || 'Available').trim().toLowerCase();
      } else if (sortField === 'mainCategory') {
        aVal = (a.mainCategory || 'IT Assets').trim().toLowerCase();
        bVal = (b.mainCategory || 'IT Assets').trim().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assets, sortField, sortDirection]);

  // Pagination slicing
  const totalItems = sortedAssets.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAssets = sortedAssets.slice(startIndex, startIndex + pageSize);

  if (assets.length === 0) {
    return (
      <div className="py-20 text-center text-neutral-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-sm">
        No assets found. Try adjusting your search or filters, or add a new asset.
      </div>
    );
  }

  // Determine if we should show the classic IT Asset table layout
  const isITLayout = assets.every(a => !a.mainCategory || a.mainCategory === "IT Assets");

  const getStatusBadgeClass = (status?: string) => {
    const s = status || "Available";
    switch (s) {
      case "Available":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Assigned":
      case "In Use":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Under Maintenance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Damaged":
      case "Lost":
        return "bg-red-50 text-red-700 border-red-200";
      case "Scrap":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "Sold":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="px-6 py-4 label-caps font-black text-[10px] cursor-pointer select-none hover:bg-slate-200 transition-colors text-slate-700"
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {active ? (
            sortDirection === 'asc' ? (
              <span className="text-blue-600 text-xs">▲</span>
            ) : (
              <span className="text-blue-600 text-xs">▼</span>
            )
          ) : (
            <span className="text-slate-300 text-[9px]">▲▼</span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200">
            {isITLayout ? (
              <tr>
                <SortHeader field="id" label="System ID" />
                <SortHeader field="assetName" label="Hardware Asset" />
                <SortHeader field="contactName" label="Auth Target / Owner" />
                <SortHeader field="location" label="Location" />
                <th className="px-6 py-4 label-caps font-black text-[10px] text-slate-700">Department</th>
                <th className="px-6 py-4 label-caps font-black text-[10px] text-slate-700 text-right">Ops</th>
              </tr>
            ) : (
              <tr>
                <SortHeader field="id" label="Asset ID" />
                <SortHeader field="assetName" label="Asset Details" />
                <SortHeader field="mainCategory" label="Category" />
                <SortHeader field="location" label="Location / Plant" />
                <SortHeader field="contactName" label="Assignee" />
                <SortHeader field="status" label="Status" />
                <th className="px-6 py-4 label-caps font-black text-[10px] text-slate-700 text-right">Ops</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedAssets.map((asset, index) => {
              const isIT = !asset.mainCategory || asset.mainCategory === "IT Assets";
              return (
                <tr key={`${asset.id}-${index}`} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1 cursor-pointer" onClick={() => onViewAsset(asset)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 tracking-tight">
                          {asset.uniqueCode || asset.assetCode || String(asset.id || 0).padStart(3, '0')}
                        </span>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          asset.binaryCode === '1' ? "bg-green-500" : "bg-slate-300"
                        )} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        ID: {asset.assetCode || String(asset.id || 0).padStart(3, '0')}
                      </span>
                    </div>
                  </td>
                  
                  {isITLayout ? (
                    /* Classic IT Layout columns */
                    <>
                      <td className="px-6 py-5 cursor-pointer" onClick={() => onViewAsset(asset)}>
                        <div className="flex items-start gap-3">
                          <DeviceThumb
                            assetType={asset.assetType}
                            mainCategory={asset.mainCategory}
                            subCategory={asset.subCategory}
                            imageUrl={asset.imageUrl}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 tracking-tight text-sm uppercase">
                                {asset.make?.replace(/^IT\s+/i, '').replace(/^IT$/i, '')} {asset.model}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-widest">{asset.assetType}</span>
                                {((asset.status && ["Damaged", "Lost", "Missing", "Under Maintenance"].includes(asset.status)) || asset.condition === "Damaged") && (
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest border animate-pulse",
                                    getStatusBadgeClass(asset.condition === 'Damaged' ? 'Damaged' : asset.status)
                                  )}>
                                    {asset.condition === 'Damaged' && asset.status !== 'Damaged' ? 'Damaged' : asset.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{asset.serialNumber}</p>
                            {(asset.ram?.trim() || asset.ssd?.trim() || asset.cpu?.trim()) && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                 {asset.ram?.trim() && <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{asset.ram}</span>}
                                 {asset.ssd?.trim() && <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">{asset.ssd}</span>}
                                 {asset.cpu?.trim() && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">{asset.cpu}</span>}
                              </div>
                            )}
                            {asset.vendorName && <p className="text-[9px] text-blue-500 font-black mt-1.5 uppercase tracking-tighter">Vendor: {asset.vendorName}</p>}
                            {asset.amcVendor ? (
                              <div className="mt-2 text-[10px] text-slate-700 bg-blue-50/50 border border-blue-100/50 p-2 rounded-xl space-y-0.5 max-w-xs font-sans text-left">
                                <p className="font-extrabold text-[9px] uppercase tracking-wider text-blue-800">AMC Details</p>
                                <p><span className="font-bold text-slate-400">Vendor:</span> {asset.amcVendor}</p>
                                <p><span className="font-bold text-slate-400">Cost:</span> {asset.amcCost ? `₹${asset.amcCost}` : "—"}</p>
                                <p><span className="font-bold text-slate-400">Duration:</span> {asset.amcStartDate || "—"} to {asset.amcEndDate || "—"}</p>
                              </div>
                            ) : (
                              <p className="mt-1.5 text-[9px] text-slate-400 italic">No AMC details available</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">
                          {asset.contactName}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-tighter">
                            <MapPin size={12} className="text-blue-500" />
                            {asset.location}
                            {asset.plantCode && (
                               <span className="ml-1 text-[9px] bg-slate-200 text-slate-600 px-1 rounded font-mono">{asset.plantCode}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit uppercase tracking-tight">
                          {asset.department || "N/A"}
                        </div>
                      </td>
                    </>
                  ) : (
                    /* Combined/Generic Company Asset Layout columns */
                    <>
                      <td className="px-6 py-5 cursor-pointer" onClick={() => onViewAsset(asset)}>
                        <div className="flex items-start gap-3">
                          <DeviceThumb
                            assetType={asset.assetType}
                            mainCategory={asset.mainCategory}
                            subCategory={asset.subCategory}
                            imageUrl={asset.imageUrl}
                            size="md"
                          />
                          <div>
                            <p className="font-black text-slate-900 tracking-tight text-sm uppercase font-sans">
                              {asset.assetName || `${asset.make} ${asset.model}`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest font-mono">
                              {asset.mainCategory === "Software / License Assets"
                                ? `Publisher: ${asset.make} | License Key: ${asset.serialNumber}`
                                : (asset.mainCategory || "IT Assets") === "Vehicle Assets"
                                ? `Brand: ${asset.make} | Chassis No: ${asset.serialNumber}`
                                : `Brand: ${asset.make} | SN: ${asset.serialNumber}`}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[8px] bg-amber-50 px-1.5 py-0.5 rounded font-black text-amber-700 font-mono">Cond: {asset.condition || 'EXISTING ASSETS'}</span>
                              {asset.dynamicDetails && Object.entries(asset.dynamicDetails)
                                .filter(([_, val]) => !!val && String(val).trim() !== '')
                                .map(([key, val]) => (
                                  <span key={key} className="text-[8px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase font-mono border border-slate-200">
                                    {key.replace(/_/g, " ")}: {String(val)}
                                  </span>
                                ))}
                            </div>
                            {asset.amcVendor ? (
                              <div className="mt-2 text-[10px] text-slate-700 bg-blue-50/50 border border-blue-100/50 p-2 rounded-xl space-y-0.5 max-w-xs font-sans text-left">
                                <p className="font-extrabold text-[9px] uppercase tracking-wider text-blue-800">AMC Details</p>
                                <p><span className="font-bold text-slate-400">Vendor:</span> {asset.amcVendor}</p>
                                <p><span className="font-bold text-slate-400">Cost:</span> {asset.amcCost ? `₹${asset.amcCost}` : "—"}</p>
                                <p><span className="font-bold text-slate-400">Duration:</span> {asset.amcStartDate || "—"} to {asset.amcEndDate || "—"}</p>
                              </div>
                            ) : (
                              <p className="mt-1.5 text-[9px] text-slate-400 italic">No AMC details available</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase tracking-wider">{asset.mainCategory || "IT Assets"}</p>
                          <p className="text-slate-600 text-xs font-bold">{asset.subCategory || asset.assetType}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-tighter">
                            <MapPin size={12} className="text-blue-500" />
                            {asset.location}
                          </div>
                          {asset.plantCode && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold font-mono tracking-tighter w-fit uppercase px-1 rounded">Plant: {asset.plantCode}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{asset.contactName || "—"}</p>
                          {asset.employeeId && <p className="text-[8px] text-slate-400 font-mono">EMP: {asset.employeeId}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "text-[9px] px-2.5 py-1 rounded-full font-black border uppercase tracking-wider",
                          getStatusBadgeClass(asset.status)
                        )}>
                          {asset.status || "Available"}
                        </span>
                      </td>
                    </>
                  )}
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => onViewQR(asset)}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="View QR Code"
                      >
                        <QrCode size={18} />
                      </button>
                      <button
                        onClick={() => onEdit(asset)}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                        title="Edit Asset"
                      >
                        <Edit2 size={18} />
                      </button>
                      {(role === 'IT Admin' || (role === 'Admin' && allowDelete)) && (
                        <button
                          onClick={() => asset.id && onDelete(asset.id)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete Asset"
                        >
                          <Trash2 size={18} />
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Page size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[10, 15, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500 ml-4">
              Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-slate-800">{Math.min(startIndex + pageSize, totalItems)}</span> of{" "}
              <span className="font-bold text-slate-800">{totalItems}</span> assets
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const pg = i + 1;
              const isCurrent = currentPage === pg;
              return (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    isCurrent
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
