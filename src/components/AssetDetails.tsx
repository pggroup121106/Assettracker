import { X, Cpu, Monitor, ShieldCheck, User, Info, Edit2, Trash2, Settings, Link as LinkIcon, ExternalLink, History } from "lucide-react";
import { Asset } from "../types";
import type { AssignmentHistoryEntry } from "../types/employee";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ReactNode, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { buildScanUrl } from "../lib/scanId";
import DeviceThumb from "./DeviceThumb";
import { getDocumentViewUrl } from "../lib/fileUrls";

interface AssetDetailsProps {
  asset: Asset;
  layout?: "modal" | "page";
  onClose?: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (id: number) => void;
  role?: string;
  assignmentHistory?: AssignmentHistoryEntry[];
}

export default function AssetDetails({
  asset,
  layout = "modal",
  onClose,
  onEdit,
  onDelete,
  role,
  assignmentHistory = [],
}: AssetDetailsProps) {
  const navigate = useNavigate();
  const scanUrl = buildScanUrl(asset);
  const isPage = layout === "page";

  const openScanPage = useCallback(() => {
    window.open(scanUrl, "_blank", "noopener,noreferrer");
  }, [scanUrl]);

  const Section = ({ title, children, icon: Icon }: { title: string; children: ReactNode; icon: typeof Info }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <Icon className="text-blue-500" size={18} />
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  const Field = ({ label, value, color = "text-slate-900" }: { label: string; value?: string; color?: string }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-black ${color}`}>{value || "—"}</p>
    </div>
  );

  const header = (
    <div className={`p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-4 ${isPage ? "rounded-t-2xl" : ""}`}>
      <div className="flex gap-4 sm:gap-6">
        <DeviceThumb
          assetType={asset.assetType}
          mainCategory={asset.mainCategory}
          subCategory={asset.subCategory}
          imageUrl={asset.imageUrl}
          size="md"
          className={isPage ? "w-20 h-20" : "w-14 h-14"}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase font-mono">
              #{String(asset.id || 0).padStart(3, "0")}
            </span>
            {(asset.uniqueCode || asset.assetCode) && (
              <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase font-mono">
                {asset.uniqueCode || asset.assetCode}
              </span>
            )}
            {asset.status && (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                {asset.status}
              </span>
            )}
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
            {asset.assetName || `${asset.make} ${asset.model}`}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {asset.mainCategory || "IT Assets"} · {asset.subCategory || asset.assetType}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <div className="flex gap-2 border-slate-200 sm:border-r sm:pr-4">
          <button
            type="button"
            onClick={() => onEdit(asset)}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
            title="Edit Asset"
          >
            <Edit2 size={18} />
            <span className="text-[10px] font-black uppercase">Edit</span>
          </button>
          {role !== "User" && (
            <button
              type="button"
              onClick={() => asset.id != null && onDelete(asset.id as number)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              title="Delete Asset"
            >
              <Trash2 size={18} />
              <span className="text-[10px] font-black uppercase">Delete</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={openScanPage}
          className="group p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all text-left"
          title="Open QR scan page"
        >
          <QRCodeSVG value={scanUrl} size={isPage ? 96 : 80} level="H" className="pointer-events-none" />
          <span className="mt-1 flex items-center justify-center gap-1 text-[8px] font-bold text-blue-600 uppercase tracking-wider opacity-80 group-hover:opacity-100">
            <ExternalLink size={10} /> Open scan
          </span>
        </button>
        {!isPage && onClose && (
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );

  const body = (
    <div className={`flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 ${isPage ? "" : ""}`}>
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs font-bold text-blue-800">Tap the QR code to open the AssetVault scan page (PDF).</p>
        <button
          type="button"
          onClick={openScanPage}
          className="text-xs font-black uppercase text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
        >
          Open scan <ExternalLink size={12} />
        </button>
      </div>

      <Section title="General Information" icon={Info}>
        <Field label="Location" value={asset.location} />
        <Field label="Plant Name" value={asset.plantCode} />
        <Field label="Department" value={asset.department} />
        <Field label="Main Category" value={asset.mainCategory || "IT Assets"} color="text-indigo-600" />
        <Field label="Sub Category" value={asset.subCategory || asset.assetType} color="text-blue-600" />
        <Field
          label={
            asset.mainCategory === "Software / License Assets"
              ? "License Key / Serial No."
              : (asset.mainCategory || "IT Assets") === "Vehicle Assets"
              ? "Chassis / Engine No."
              : "Serial Number"
          }
          value={asset.serialNumber}
        />
        <Field label="Condition" value={asset.condition || "Good"} color="text-amber-600" />
        <Field label="Status" value={asset.status || "Available"} color="text-emerald-600 font-bold" />
      </Section>

      {(asset.mainCategory || "IT Assets") === "IT Assets" &&
        (["Laptop", "Desktop"].includes(asset.assetType) || asset.macAddress?.trim()) && (
          <Section title="Tech Specifications" icon={Cpu}>
            {["Laptop", "Desktop"].includes(asset.assetType) && (
              <>
                <Field label="CPU" value={asset.cpu} />
                <Field label="RAM" value={asset.ram} />
                <Field label="Storage (SSD)" value={asset.ssd} />
                <Field label="Windows Version" value={asset.windowsVersion} />
              </>
            )}
            {asset.macAddress?.trim() && (
              <div className={["Laptop", "Desktop"].includes(asset.assetType) ? "" : "sm:col-span-2"}>
                <Field label="MAC Address" value={asset.macAddress} color="text-slate-500 font-mono" />
              </div>
            )}
          </Section>
        )}

      <Section title="Purchase & Vendor" icon={ShieldCheck}>
        <Field label="Vendor Name" value={asset.vendorName} />
        <Field label="PO Number" value={asset.invoiceNumber || "—"} />
        <Field label="Purchase Date" value={asset.purchaseDate || "—"} />
        <Field label="Purchase Cost" value={asset.purchaseCost ? `₹${asset.purchaseCost}` : "—"} />
        <Field label="Warranty Start" value={asset.warrantyStartDate} />
        <Field label="Warranty Exp" value={asset.warrantyEndDate} color="text-red-500" />
      </Section>

      {asset.maintenanceRequired === "Yes" && (
        <Section title="Maintenance Logs" icon={Settings}>
          <Field label="Maintenance Status" value="Required" color="text-amber-500" />
          <Field label="Last Maintenance Date" value={asset.lastMaintenanceDate || "—"} />
          <Field label="Next Maintenance Date" value={asset.nextMaintenanceDate || "—"} color="text-red-500" />
        </Section>
      )}

      {asset.amcVendor && (
        <Section title="AMC Details" icon={ShieldCheck}>
          <Field label="Asset ID" value={asset.assetCode || String(asset.id)} />
          <Field label="Asset Name" value={asset.assetName || `${asset.make} ${asset.model}`} />
          <Field label="AMC Vendor" value={asset.amcVendor} />
          <Field label="AMC Cost" value={asset.amcCost ? `₹${asset.amcCost}` : "—"} />
          <Field label="AMC Start Date" value={asset.amcStartDate} />
          <Field label="AMC End Date" value={asset.amcEndDate} color="text-red-500" />
        </Section>
      )}

      {(asset.mainCategory || "IT Assets") === "IT Assets" &&
        asset.assetType === "Desktop" &&
        (asset.monitorSerial ||
          asset.monitorAssetCode ||
          asset.keyboardSerial ||
          asset.keyboardAssetCode ||
          asset.mouseSerial ||
          asset.mouseAssetCode) && (
          <Section title="Peripherals" icon={Monitor}>
            <Field label="Monitor Serial" value={asset.monitorSerial} />
            <Field label="Monitor Asset Code" value={asset.monitorAssetCode} />
            <Field label="Keyboard Serial" value={asset.keyboardSerial} />
            <Field label="Keyboard Asset Code" value={asset.keyboardAssetCode} />
            <Field label="Mouse Serial" value={asset.mouseSerial} />
            <Field label="Mouse Asset Code" value={asset.mouseAssetCode} />
          </Section>
        )}

      <Section title="Remarks & Audit" icon={Settings}>
        <div className="sm:col-span-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remarks</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap mb-4">{asset.additionalItems || "—"}</p>
        </div>
        <Field label="Created By" value={asset.createdBy || "—"} />
        <Field label="Created Date" value={asset.createdDate || "—"} />
        <Field label="Updated By" value={asset.updatedBy || "—"} />
        <Field label="Updated Date" value={asset.updatedDate || "—"} />
      </Section>

      {role !== "User" && (
        <Section title="Attached Document" icon={LinkIcon}>
          <div className="sm:col-span-2">
            {asset.documentUrl ? (
              <a
                href={getDocumentViewUrl(asset.documentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 font-bold underline flex items-center gap-2"
              >
                <LinkIcon size={14} /> Open Document (PDF)
              </a>
            ) : (
              <p className="text-sm text-slate-400 font-medium italic">No document attached.</p>
            )}
          </div>
        </Section>
      )}

      {asset.dynamicDetails && Object.keys(asset.dynamicDetails).some(k => !!asset.dynamicDetails![k] && String(asset.dynamicDetails![k]).trim() !== '') && (
        <Section title="Type-specific details" icon={Info}>
          {Object.entries(asset.dynamicDetails)
            .filter(([_, value]) => !!value && String(value).trim() !== '')
            .map(([fieldKey, value]) => (
            <div key={fieldKey}>
              <Field
                label={fieldKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                value={value as string}
                color="text-slate-800"
              />
            </div>
          ))}
        </Section>
      )}

      <Section title="User Assignment" icon={User}>
        <Field label="Assignee Full Name" value={asset.contactName} color="text-slate-900" />
        <div>
          <Field label="Employee ID" value={asset.employeeId || "—"} />
          {asset.employeeId?.trim() && isPage && (
            <button
              type="button"
              onClick={() => navigate(`/employees/${encodeURIComponent(asset.employeeId!)}`)}
              className="mt-2 text-xs font-black uppercase text-blue-600 hover:text-blue-800"
            >
              Open employee profile →
            </button>
          )}
        </div>
        <Field label="Email Address" value={asset.contactEmail} />
        <Field label="Mobile Number" value={asset.contactMobile} />
      </Section>

      {assignmentHistory.length > 0 && (
        <Section title="Assignment history" icon={History}>
          <div className="sm:col-span-2 space-y-3">
            {assignmentHistory.slice(0, 10).map((h) => (
              <div key={h.id} className="flex flex-wrap gap-2 items-center text-xs border-b border-slate-100 pb-2">
                <span className="font-black uppercase text-blue-700">{h.action}</span>
                <span className="text-slate-600">{h.assignedDate}</span>
                <span className="font-bold text-slate-800">{h.employeeName || h.employeeId}</span>
                {h.remarks && <span className="text-slate-500">— {h.remarks}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );

  const card = (
    <div
      className={`bg-white flex flex-col overflow-hidden ${
        isPage
          ? "rounded-2xl border border-slate-200 shadow-sm w-full"
          : "w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh]"
      }`}
    >
      {header}
      {body}
    </div>
  );

  if (isPage) {
    return card;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {card}
      </motion.div>
    </motion.div>
  );
}
