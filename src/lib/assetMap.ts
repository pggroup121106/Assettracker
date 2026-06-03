import type { Asset } from '../types';
import { SUB_TO_MAIN_MAP } from './assetCatalogByType';

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getVal(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = item[key];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  const normalizedKeys = keys.map((k) => normalizeKey(k));
  for (const itemKey of Object.keys(item)) {
    if (normalizedKeys.includes(normalizeKey(itemKey))) {
      const v = item[itemKey];
      if (v !== undefined && v !== null && v !== '') return String(v);
    }
  }
  return '';
}

export function mapAssetsFromApi(data: Record<string, unknown>[]): Asset[] {
  return data.map((item) => {
    let rawMainCat = getVal(item, ['Main Category', 'mainCategory']);
    const subCat = getVal(item, ['Sub Category', 'Asset Type', 'Type']) || 'Other IT Asset';

    if (!rawMainCat || rawMainCat === 'IT Assets') {
      if (subCat && SUB_TO_MAIN_MAP[subCat]) {
        rawMainCat = SUB_TO_MAIN_MAP[subCat];
      } else {
        rawMainCat = rawMainCat || 'IT Assets';
      }
    }

    return {
      id: getVal(item, ['S No', 'ID', 'SR.NO', 'id', 'Asset ID']) as unknown as number,
      location: getVal(item, ['Location', 'Loc']),
      plantCode: getVal(item, ['Plant Name', 'Plant Code', 'Plant', 'plantCode']),
      department: getVal(item, ['Department', 'Dept']),
      make: getVal(item, ['Make', 'Brand', 'Brand/Make']),
      model: getVal(item, ['Model']),
      serialNumber: getVal(item, ['Serial Number', 'SN', 'SERIAL NO.']),
      assetCode: getVal(item, ['Asset Code']),
      vendorName: getVal(item, ['Vendor Name', 'Vendor']),
      warrantyStartDate: getVal(item, ['Warranty Start Date', 'Warranty Start']),
      warrantyEndDate: getVal(item, ['Warranty Expiry Date', 'Warranty End']),
      ram: getVal(item, ['RAM']),
      ssd: getVal(item, ['SSD', 'Storage']),
      cpu: getVal(item, ['CPU', 'Processor']),
      windowsVersion: getVal(item, ['Windows Version', 'OS']),
      assetType: (getVal(item, ['Asset Type', 'Type']) || subCat || 'Laptop') as Asset['assetType'],
      macAddress: getVal(item, ['MAC Address', 'MAC']),
      monitorSerial: getVal(item, ['Monitor Serial', 'Monitor SN']),
      monitorAssetCode: getVal(item, ['Monitor Asset Code', 'Monitor Code']),
      keyboardSerial: getVal(item, ['Keyboard Serial', 'Keyboard SN']),
      keyboardAssetCode: getVal(item, ['Keyboard Asset Code', 'Keyboard Code']),
      mouseSerial: getVal(item, ['Mouse Serial', 'Mouse SN']),
      mouseAssetCode: getVal(item, ['Mouse Asset Code', 'Mouse Code']),
      upsSerial: getVal(item, ['UPS Serial', 'UPS SN']),
      upsAssetCode: getVal(item, ['UPS Asset Code', 'UPS Code']),
      contactName: getVal(item, [
        'Assigned To',
        'Contact Person Name',
        'Auth Target / Owner',
        'Owner',
        'ASSIGNEE NAME ',
      ]),
      contactEmail: getVal(item, ['Contact Email', 'Contact Person Email', 'Email', 'MAIL ID ']),
      contactMobile: getVal(item, [
        'Contact Number',
        'Contact Person Mobile Number',
        'Mobile',
        'CONTACT NUMBER ',
      ]),
      documentUrl: getVal(item, ['Document URL / Attached Documents', 'Document Link', 'Document']),
      imageUrl: getVal(item, ['Photo URL / Photo Upload', 'Asset Image', 'Image', 'Image URL']),
      additionalItems: getVal(item, ['Remarks', 'Additional Items']),
      qrCodeText: getVal(item, ['QR Code / Barcode', 'QR Code Text']),
      qrCodeImage: '',
      uniqueCode: getVal(item, ['Unique Code']),
      binaryCode: getVal(item, ['Binary Code']),
      assetName: getVal(item, ['Asset Name']) || getVal(item, ['Model']) || '',
      mainCategory: rawMainCat,
      subCategory: subCat,
      quantity: getVal(item, ['Quantity']) || '1',
      employeeId: getVal(item, ['Employee ID']),
      purchaseDate: getVal(item, ['Purchase Date']),
      purchaseCost: getVal(item, ['Purchase Cost']),
      invoiceNumber: getVal(item, ['Invoice Number']),
      condition: (() => {
        const cond = getVal(item, ['Condition']);
        if (cond === 'New') return 'NEW PURCHASE';
        if (cond === 'Good' || !cond) return 'EXISTING ASSETS';
        return cond;
      })() as Asset['condition'],
      status: (getVal(item, ['Status']) || 'Available') as Asset['status'],
      maintenanceRequired: getVal(item, ['Maintenance Required']) as Asset['maintenanceRequired'],
      lastMaintenanceDate: getVal(item, ['Last Maintenance Date']),
      nextMaintenanceDate: getVal(item, ['Next Maintenance Date']),
      createdBy: getVal(item, ['Created By']),
      createdDate: getVal(item, ['Created Date']),
      updatedBy: getVal(item, ['Updated By']),
      updatedDate: getVal(item, ['Updated Date']),
      extraItems: getVal(item, ['Extra Items', 'extraItems']),
      missingItems: getVal(item, ['Missing Items', 'missingItems']),
      assignedDate: getVal(item, ['Assigned Date', 'assignedDate']),
      returnDate: getVal(item, ['Return Date', 'returnDate']),
      amcVendor: getVal(item, ['AMC Vendor', 'amcVendor']),
      amcStartDate: getVal(item, ['AMC Start Date', 'amcStartDate']),
      amcEndDate: getVal(item, ['AMC End Date', 'amcEndDate']),
      amcCost: getVal(item, ['AMC Cost', 'amcCost']),
      dynamicDetails:
        item.dynamicDetails && typeof item.dynamicDetails === 'object'
          ? (item.dynamicDetails as Record<string, string>)
          : {},
      assetTypeId: getVal(item, ['assetTypeId', 'Asset Type ID']),
    };
  });
}
