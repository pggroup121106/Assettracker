import type { Asset, AssetFormData, AssetType, DesktopAccessories } from "../types";
import { normalizeWarrantyDate } from "./warrantyDate";
import { PERIPHERAL_TYPES } from "./assetCatalogByType";
import { legacyToDynamicDetails, resolveTypeDefinition, defaultTypeDefinitionsConfig } from "./typeDefinitions";


const DEFAULT_ACCESSORIES: DesktopAccessories = {
  mouse: false,
  keyboard: false,
  monitor: false,
  ups: false,
};

/** Normalize sheet / API asset type strings to a known form value. */
export function normalizeAssetType(raw?: string): AssetType {
  const t = (raw || "Laptop").trim();
  if (t === "Laptop" || t === "Desktop") return t;
  if ((PERIPHERAL_TYPES as readonly string[]).includes(t)) return t as AssetType;
  const lower = t.toLowerCase();
  const hit = PERIPHERAL_TYPES.find((p) => p.toLowerCase() === lower);
  if (hit) return hit as AssetType;
  return "Laptop";
}

export function assetToFormData(asset?: Asset | null): AssetFormData {
  if (!asset) {
    return {
      location: "",
      plantCode: "",
      department: "",
      make: "",
      model: "",
      serialNumber: "",
      assetCode: "",
      vendorName: "",
      warrantyStartDate: "",
      warrantyEndDate: "",
      ram: "8GB",
      ssd: "256GB",
      cpu: "",
      windowsVersion: "Windows 11 Pro",
      assetType: "Laptop",
      accessories: { ...DEFAULT_ACCESSORIES },
      monitorSerial: "",
      monitorAssetCode: "",
      keyboardSerial: "",
      keyboardAssetCode: "",
      mouseSerial: "",
      mouseAssetCode: "",
      upsSerial: "",
      upsAssetCode: "",
      macAddress: "",
      contactName: "",
      contactEmail: "",
      contactMobile: "",
      documentUrl: "",
      imageUrl: "",
      additionalItems: "",

      // New fields
      assetName: "",
      mainCategory: "IT Assets",
      subCategory: "Laptop / Desktop",
      quantity: "1",
      employeeId: "",
      purchaseDate: "",
      purchaseCost: "",
      invoiceNumber: "",
      condition: "EXISTING ASSETS",
      status: "Available",
      maintenanceRequired: "No",
      lastMaintenanceDate: "",
      nextMaintenanceDate: "",
      createdBy: "",
      createdDate: "",
      updatedBy: "",
      updatedDate: "",
      extraItems: "",
      missingItems: "",
      assignedDate: "",
      returnDate: "",
      amcVendor: "",
      amcStartDate: "",
      amcEndDate: "",
      amcCost: "",
      dynamicDetails: {},
      assetTypeId: "laptop",
    };
  }

  const typeDef = resolveTypeDefinition(defaultTypeDefinitionsConfig(), {
    assetTypeId: asset.assetTypeId,
    assetType: asset.assetType,
    mainCategory: asset.mainCategory,
    subCategory: asset.subCategory,
  });

  return {
    location: asset.location || "",
    plantCode: asset.plantCode || "",
    department: asset.department || "",
    make: asset.make || "",
    model: asset.model || "",
    serialNumber: asset.serialNumber || "",
    assetCode: asset.assetCode || "",
    vendorName: asset.vendorName || "",
    warrantyStartDate: normalizeWarrantyDate(asset.warrantyStartDate),
    warrantyEndDate: normalizeWarrantyDate(asset.warrantyEndDate),
    ram: asset.ram || "8GB",
    ssd: asset.ssd || "256GB",
    cpu: asset.cpu || "",
    windowsVersion: asset.windowsVersion || "Windows 11 Pro",
    assetType: normalizeAssetType(asset.assetType),
    accessories: asset.accessories || { ...DEFAULT_ACCESSORIES },
    monitorSerial: asset.monitorSerial || "",
    monitorAssetCode: asset.monitorAssetCode || "",
    keyboardSerial: asset.keyboardSerial || "",
    keyboardAssetCode: asset.keyboardAssetCode || "",
    mouseSerial: asset.mouseSerial || "",
    mouseAssetCode: asset.mouseAssetCode || "",
    upsSerial: asset.upsSerial || "",
    upsAssetCode: asset.upsAssetCode || "",
    macAddress: asset.macAddress || "",
    contactName: asset.contactName || "",
    contactEmail: asset.contactEmail || "",
    contactMobile: asset.contactMobile || "",
    documentUrl: asset.documentUrl || "",
    imageUrl: asset.imageUrl || "",
    additionalItems: asset.additionalItems || "",

    // New fields
    assetName: asset.assetName || "",
    mainCategory: asset.mainCategory || "IT Assets",
    subCategory: asset.subCategory || "",
    quantity: asset.quantity || "1",
    employeeId: asset.employeeId || "",
    purchaseDate: asset.purchaseDate || "",
    purchaseCost: asset.purchaseCost || "",
    invoiceNumber: asset.invoiceNumber || "",
    condition: (() => {
      if (asset.condition === 'New') return 'NEW PURCHASE';
      if (asset.condition === 'Good' || !asset.condition) return 'EXISTING ASSETS';
      return asset.condition;
    })(),
    status: asset.status || "Available",
    maintenanceRequired: asset.maintenanceRequired || "No",
    lastMaintenanceDate: asset.lastMaintenanceDate || "",
    nextMaintenanceDate: asset.nextMaintenanceDate || "",
    createdBy: asset.createdBy || "",
    createdDate: asset.createdDate || "",
    updatedBy: asset.updatedBy || "",
    updatedDate: asset.updatedDate || "",
    extraItems: asset.extraItems || "",
    missingItems: asset.missingItems || "",
    assignedDate: asset.assignedDate || "",
    returnDate: asset.returnDate || "",
    amcVendor: asset.amcVendor || "",
    amcStartDate: asset.amcStartDate || "",
    amcEndDate: asset.amcEndDate || "",
    amcCost: asset.amcCost || "",
    dynamicDetails: legacyToDynamicDetails(typeDef, asset as unknown as Record<string, unknown>),
    assetTypeId: asset.assetTypeId || typeDef?.id || "",
  };
}

/** Ensure select lists include the current stored value (edit mode). */
export function optionsWithValue(options: string[], current?: string): string[] {
  const c = current?.trim();
  if (!c) return options;
  if (options.includes(c)) return options;
  return [c, ...options];
}
