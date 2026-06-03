import React, { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Asset } from "../types";
import { Printer, X } from "lucide-react";
import { buildScanUrl } from "../lib/scanId";

interface QRCodeDisplayProps {
  asset: Asset;
  onClose: () => void;
}

export default function QRCodeDisplay({ asset, onClose }: QRCodeDisplayProps) {
  const [selectedTab, setSelectedTab] = useState<'main' | 'monitor' | 'keyboard' | 'mouse' | 'ups'>('main');

  const hasMonitor = !!(asset.monitorSerial || asset.monitorAssetCode);
  const hasKeyboard = !!(asset.keyboardSerial || asset.keyboardAssetCode);
  const hasMouse = !!(asset.mouseSerial || asset.mouseAssetCode);
  const hasUps = !!(asset.upsSerial || asset.upsAssetCode);

  const activeDetails = useMemo(() => {
    if (selectedTab === 'monitor') {
      const code = asset.monitorAssetCode || asset.monitorSerial || '';
      return {
        label: "Monitor Label",
        uniqueCode: asset.monitorAssetCode || "MON-N/A",
        serialNumber: asset.monitorSerial || "N/A",
        assetType: "Monitor",
        qrValue: `${window.location.origin}/scan/${encodeURIComponent(code)}`,
      };
    }
    if (selectedTab === 'keyboard') {
      const code = asset.keyboardAssetCode || asset.keyboardSerial || '';
      return {
        label: "Keyboard Label",
        uniqueCode: asset.keyboardAssetCode || "KBD-N/A",
        serialNumber: asset.keyboardSerial || "N/A",
        assetType: "Keyboard",
        qrValue: `${window.location.origin}/scan/${encodeURIComponent(code)}`,
      };
    }
    if (selectedTab === 'mouse') {
      const code = asset.mouseAssetCode || asset.mouseSerial || '';
      return {
        label: "Mouse Label",
        uniqueCode: asset.mouseAssetCode || "MSE-N/A",
        serialNumber: asset.mouseSerial || "N/A",
        assetType: "Mouse",
        qrValue: `${window.location.origin}/scan/${encodeURIComponent(code)}`,
      };
    }
    if (selectedTab === 'ups') {
      const code = asset.upsAssetCode || asset.upsSerial || '';
      return {
        label: "UPS Label",
        uniqueCode: asset.upsAssetCode || "UPS-N/A",
        serialNumber: asset.upsSerial || "N/A",
        assetType: "UPS",
        qrValue: `${window.location.origin}/scan/${encodeURIComponent(code)}`,
      };
    }
    // Main asset
    return {
      label: "Asset Label",
      uniqueCode: asset.uniqueCode || asset.assetCode || '',
      serialNumber: asset.serialNumber || '',
      assetType: asset.assetType,
      qrValue: buildScanUrl(asset),
    };
  }, [selectedTab, asset]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-between items-center w-full mb-6 no-print">
         <div className="flex items-center gap-3">
           <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/30" />
           <h2 className="text-2xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">{activeDetails.label}</h2>
         </div>
         <button onClick={onClose} className="p-2.5 bg-white shadow-sm hover:shadow-md hover:bg-slate-50 rounded-xl transition-all text-slate-500 hover:text-slate-700">
            <X size={20} strokeWidth={2.5} />
         </button>
      </div>

      {asset.assetType === 'Desktop' && (hasMonitor || hasKeyboard || hasMouse || hasUps) && (
        <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-xl w-full no-print">
          <button
            onClick={() => setSelectedTab('main')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              selectedTab === 'main' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Desktop
          </button>
          {hasMonitor && (
            <button
              onClick={() => setSelectedTab('monitor')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                selectedTab === 'monitor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monitor
            </button>
          )}
          {hasKeyboard && (
            <button
              onClick={() => setSelectedTab('keyboard')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                selectedTab === 'keyboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Keyboard
            </button>
          )}
          {hasMouse && (
            <button
              onClick={() => setSelectedTab('mouse')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                selectedTab === 'mouse' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mouse
            </button>
          )}
          {hasUps && (
            <button
              onClick={() => setSelectedTab('ups')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                selectedTab === 'ups' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              UPS
            </button>
          )}
        </div>
      )}

      <div id="qr-card" className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 w-[380px] max-w-full flex flex-col gap-8 mx-auto print:shadow-none print:border-none print:p-0 print:w-auto print:m-0">
        
        <div className="flex justify-between items-start no-print">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-indigo-500 leading-none">Security ID System v2</h3>
            <div className="text-5xl font-black text-slate-800 tracking-tight leading-none mt-1">
              {activeDetails.uniqueCode}
            </div>
          </div>
          <div className="w-[52px] h-[52px] bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100/50 flex-shrink-0">
             <div className="w-[26px] h-[26px] bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-sm"></div>
          </div>
        </div>

        <a
          href={activeDetails.qrValue}
          target="_blank"
          rel="noopener noreferrer"
          id="printable-inner-qr"
          className="bg-slate-50/60 p-[18px] rounded-[20px] flex items-center gap-5 border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer no-underline text-inherit"
          title="Open AssetVault scan page"
        >
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100/80 flex-shrink-0" id="qr-box">
            <QRCodeSVG 
              value={activeDetails.qrValue}
              size={100}
              level="H"
              includeMargin={false}
              className="qr-svg-print pointer-events-none"
            />
          </div>
          <div className="flex flex-col flex-1 justify-center py-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 print:text-slate-500 print:text-[6px] print:mb-0">{activeDetails.label}</div>
            <div className="text-lg text-slate-800 font-mono font-semibold tracking-tight mb-4 print:text-[12px] print:mb-1 leading-none">
              {String(activeDetails.serialNumber || "UNKNOWN")}
            </div>
            <div className="flex flex-col gap-2.5 print:gap-[2px]">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 print:w-1 print:h-1"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[70px] print:text-[6px] print:w-[35px]">Assigned:</span>
                  <span className="text-[11px] font-bold text-slate-800 truncate print:text-[7px] max-w-[60px]">{asset.contactName || "N/A"}</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 print:w-1 print:h-1"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[70px] print:text-[6px] print:w-[35px]">Category:</span>
                  <span className="text-[11px] font-bold text-slate-800 truncate print:text-[7px] max-w-[60px]">{activeDetails.assetType}</span>
               </div>
            </div>
          </div>
        </a>

        <div className="pt-4 border-t border-slate-200/80 space-y-1 no-print">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">Scan opens merged PDF (details + image + documents)</p>
          <p className="text-[8px] text-blue-600 font-mono text-center break-all px-2">{activeDetails.qrValue}</p>
        </div>
        <div className="pt-3 flex items-center justify-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] text-center no-print">
           <span>© 2026 AssetVault</span>
        </div>
      </div>

      <div className="mt-8 flex gap-4 w-full no-print">
        <button
          onClick={onClose}
          className="flex-1 py-3.5 px-6 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow focus:ring-4 focus:ring-slate-100"
        >
          Close
        </button>
        <button
          onClick={handlePrint}
          className="flex-[2] py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 hover:-translate-y-0.5 focus:ring-4 focus:ring-indigo-500/20 flex items-center justify-center gap-2"
        >
          <Printer size={18} strokeWidth={2.5} />
          Generate Print Out
        </button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body * {
            visibility: hidden;
          }
          html, body {
            background-color: white !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #printable-inner-qr, #printable-inner-qr * {
            visibility: visible;
          }
          #printable-inner-qr {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            width: 7cm !important;
            height: 3cm !important;
            padding: 4px 8px !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
            background-color: white !important;
            display: flex !important;
            align-items: center !important;
            box-sizing: border-box !important;
            gap: 8px !important;
          }
          #qr-box {
            padding: 4px !important;
            border: 1px solid #f1f5f9 !important;
            border-radius: 6px !important;
          }
          .qr-svg-print {
            width: 2cm !important;
            height: 2cm !important;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
