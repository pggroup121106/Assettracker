import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type { MappedAsset } from "./assetHelpers.js";
import { getScanUrl } from "./assetHelpers.js";
import { fetchRemoteFile } from "./fileProxy.js";

/** pdf-lib StandardFonts only support WinAnsi — strip unsupported chars */
function pdfSafeText(value: unknown, maxLen = 120): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s
    .replace(/\u2014|\u2013/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?")
    .slice(0, maxLen);
}

function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function isPdf(contentType: string, url: string) {
  return contentType.includes("pdf") || url.toLowerCase().includes(".pdf");
}

function isImage(contentType: string, url: string) {
  return contentType.includes("image") || /\.(png|jpe?g|gif|webp)$/i.test(url);
}

async function embedImageOnPage(
  pdfDoc: PDFDocument,
  bytes: Uint8Array,
  contentType: string,
  title: string
) {
  let image;
  try {
    if (contentType.includes("png") || bytes[0] === 0x89) {
      image = await pdfDoc.embedPng(bytes);
    } else {
      image = await pdfDoc.embedJpg(bytes);
    }
  } catch {
    return;
  }

  const maxW = 500;
  const maxH = 650;
  const scale = Math.min(maxW / image.width, maxH / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;

  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(pdfSafeText(title), { x: 40, y: 800, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
  page.drawImage(image, {
    x: (595 - w) / 2,
    y: 842 - 60 - h,
    width: w,
    height: h,
  });
}

async function mergePdfBytes(pdfDoc: PDFDocument, bytes: Uint8Array) {
  if (!isPdfBytes(bytes)) return;
  try {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await pdfDoc.copyPages(src, src.getPageIndices());
    pages.forEach((p) => pdfDoc.addPage(p));
  } catch (err) {
    console.warn("Skipping invalid PDF attachment:", err);
  }
}

async function drawDetailsPage(
  pdfDoc: PDFDocument,
  asset: MappedAsset,
  scanUrl: string
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let qrImage;
  try {
    const qrPng = await QRCode.toBuffer(scanUrl, {
      type: "png",
      width: 140,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    qrImage = await pdfDoc.embedPng(new Uint8Array(qrPng));
  } catch {
    qrImage = null;
  }

  const page = pdfDoc.addPage([595, 842]);
  let y = 800;

  page.drawText("AssetVault - Asset System Details", {
    x: 40,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.8, 0.1, 0.1),
  });
  y -= 36;

  const isItDevice = (asset.mainCategory || "IT Assets") === "IT Assets";
  const isComputer = isItDevice && ["Laptop", "Desktop"].includes(asset.assetType);

  const lines: [string, string][] = [
    ["Asset ID", asset.id],
    ["Unique Code", asset.uniqueCode],
    ["Serial Number", asset.serialNumber],
    ["Asset Code", asset.assetCode],
    ["Type", asset.assetType],
    ["Location", asset.location],
    ["Plant", asset.plantCode],
    ["Department", asset.department],
    ["Make / Model", `${asset.make} ${asset.model}`.trim()],
    ["Vendor", asset.vendorName],
  ];

  if (isComputer) {
    const ramStorage = `${asset.ram || ""} / ${asset.ssd || ""}`.trim();
    if (ramStorage && ramStorage !== "/") {
      lines.push(["RAM / Storage", ramStorage]);
    }
    const cpuOs = `${asset.cpu || ""} / ${asset.windowsVersion || ""}`.trim();
    if (cpuOs && cpuOs !== "/") {
      lines.push(["CPU / OS", cpuOs]);
    }
  }

  if (isItDevice && asset.macAddress?.trim()) {
    lines.push(["MAC Address", asset.macAddress]);
  }

  lines.push(
    ["Assigned To", asset.contactName],
    ["Email", asset.contactEmail],
    ["Mobile", asset.contactMobile],
    ["Warranty", `${asset.warrantyStartDate} - ${asset.warrantyEndDate}`.trim()],
    ["Document Link", asset.documentUrl],
    ["Remarks", asset.additionalItems]
  );

  for (const [label, value] of lines) {
    const safe = pdfSafeText(value);
    if (!safe) continue;
    page.drawText(`${pdfSafeText(label)}:`, {
      x: 40,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(safe, { x: 160, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
    if (y < 140) break;
  }

  page.drawText("Scan QR for full PDF:", {
    x: 40,
    y: 110,
    size: 10,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (qrImage) {
    page.drawImage(qrImage, { x: 40, y: 20, width: 90, height: 90 });
  }

  const safeUrl = pdfSafeText(scanUrl, 200);
  page.drawText(safeUrl, {
    x: qrImage ? 140 : 40,
    y: 55,
    size: 8,
    font,
    color: rgb(0.2, 0.2, 0.6),
  });
}

async function drawPeripheralDetailsPage(
  pdfDoc: PDFDocument,
  asset: MappedAsset,
  baseUrl: string,
  type: string,
  serial: string,
  code: string
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const scanUrl = `${baseUrl.replace(/\/$/, "")}/scan/${encodeURIComponent(code || serial)}`;

  let qrImage;
  try {
    const qrPng = await QRCode.toBuffer(scanUrl, {
      type: "png",
      width: 140,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    qrImage = await pdfDoc.embedPng(new Uint8Array(qrPng));
  } catch {
    qrImage = null;
  }

  const page = pdfDoc.addPage([595, 842]);
  let y = 800;

  page.drawText(`AssetVault - ${type} Details`, {
    x: 40,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.4, 0.8),
  });
  y -= 36;

  const lines: [string, string][] = [
    ["Device Type", type],
    ["Asset Code", code],
    ["Serial Number", serial],
    ["Belongs To (Desktop)", `${asset.make} ${asset.model} (ID: ${asset.uniqueCode})`],
    ["Location", asset.location],
    ["Plant", asset.plantCode],
    ["Department", asset.department],
    ["Assigned To", asset.contactName],
    ["Email", asset.contactEmail],
    ["Mobile", asset.contactMobile],
  ];

  for (const [label, value] of lines) {
    const safe = pdfSafeText(value);
    if (!safe) continue;
    page.drawText(`${pdfSafeText(label)}:`, {
      x: 40,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(safe, { x: 180, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 22;
  }

  page.drawText("Scan QR for peripheral PDF:", {
    x: 40,
    y: 110,
    size: 10,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (qrImage) {
    page.drawImage(qrImage, { x: 40, y: 20, width: 90, height: 90 });
  }

  const safeUrl = pdfSafeText(scanUrl, 200);
  page.drawText(safeUrl, {
    x: qrImage ? 140 : 40,
    y: 55,
    size: 8,
    font,
    color: rgb(0.2, 0.2, 0.6),
  });
}

export async function generateAssetPdf(
  asset: MappedAsset,
  baseUrl: string,
  scanId?: string
): Promise<Uint8Array> {
  const matchKey = scanId ? decodeURIComponent(scanId).toLowerCase().trim() : "";

  let peripheralType: "Monitor" | "Keyboard" | "Mouse" | "UPS" | null = null;
  let peripheralSerial = "";
  let peripheralCode = "";

  if (matchKey && asset.assetType === "Desktop") {
    if (
      (asset.monitorSerial && asset.monitorSerial.toLowerCase().trim() === matchKey) ||
      (asset.monitorAssetCode && asset.monitorAssetCode.toLowerCase().trim() === matchKey)
    ) {
      peripheralType = "Monitor";
      peripheralSerial = asset.monitorSerial;
      peripheralCode = asset.monitorAssetCode;
    } else if (
      (asset.keyboardSerial && asset.keyboardSerial.toLowerCase().trim() === matchKey) ||
      (asset.keyboardAssetCode && asset.keyboardAssetCode.toLowerCase().trim() === matchKey)
    ) {
      peripheralType = "Keyboard";
      peripheralSerial = asset.keyboardSerial;
      peripheralCode = asset.keyboardAssetCode;
    } else if (
      (asset.mouseSerial && asset.mouseSerial.toLowerCase().trim() === matchKey) ||
      (asset.mouseAssetCode && asset.mouseAssetCode.toLowerCase().trim() === matchKey)
    ) {
      peripheralType = "Mouse";
      peripheralSerial = asset.mouseSerial;
      peripheralCode = asset.mouseAssetCode;
    } else if (
      (asset.upsSerial && asset.upsSerial.toLowerCase().trim() === matchKey) ||
      (asset.upsAssetCode && asset.upsAssetCode.toLowerCase().trim() === matchKey)
    ) {
      peripheralType = "UPS";
      peripheralSerial = asset.upsSerial;
      peripheralCode = asset.upsAssetCode;
    }
  }

  if (peripheralType) {
    const pdfDoc = await PDFDocument.create();
    await drawPeripheralDetailsPage(
      pdfDoc,
      asset,
      baseUrl,
      peripheralType,
      peripheralSerial,
      peripheralCode
    );
    const bytes = await pdfDoc.save();
    return bytes;
  }

  const scanUrl = getScanUrl(baseUrl, asset);
  const pdfDoc = await PDFDocument.create();

  await drawDetailsPage(pdfDoc, asset, scanUrl);

  if (asset.imageUrl) {
    try {
      const imgData = await fetchRemoteFile(asset.imageUrl);
      if (imgData && isImage(imgData.contentType, asset.imageUrl)) {
        await embedImageOnPage(pdfDoc, imgData.bytes, imgData.contentType, "Asset Image");
      }
    } catch (err) {
      console.warn("Asset image embed skipped:", err);
    }
  }

  if (asset.documentUrl) {
    try {
      const docData = await fetchRemoteFile(asset.documentUrl);
      if (docData) {
        if (isPdfBytes(docData.bytes) || isPdf(docData.contentType, asset.documentUrl)) {
          await mergePdfBytes(pdfDoc, docData.bytes);
        } else if (isImage(docData.contentType, asset.documentUrl)) {
          await embedImageOnPage(pdfDoc, docData.bytes, docData.contentType, "Attached Document");
        }
      }
    } catch (err) {
      console.warn("Document embed skipped:", err);
    }
  }

  const bytes = await pdfDoc.save();
  if (!isPdfBytes(bytes)) {
    throw new Error("Generated PDF is invalid");
  }
  return bytes;
}
