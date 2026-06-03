import type { AssetFormData } from '../types';
import type { AssetTypeDefinition, TypeDefinitionsConfig } from '../types/categoryTypes';
import { PERIPHERAL_TYPES } from './assetCatalogByType';
import { resolveTypeDefinition } from './typeDefinitions';

export interface EntryFormProfile {
  mainCategory: string;
  isItAssets: boolean;
  isItPrimaryDevice: boolean;
  isItPeripheral: boolean;
  /** Non-IT: dedicated asset name field */
  useAssetNameField: boolean;
  /** IT: brand + model required */
  useBrandModelFields: boolean;
  requireMacAddress: boolean;
  showLegacyItSpecs: boolean;
  showDynamicSpecs: boolean;
  serialLabel: string;
  assetCodeLabel: string;
  makeLabel: string;
  modelLabel: string;
}

export function getEntryFormProfile(
  formData: Pick<AssetFormData, 'mainCategory' | 'assetType' | 'subCategory'>,
  activeTypeDef: AssetTypeDefinition | null
): EntryFormProfile {
  const mainCategory = formData.mainCategory || 'IT Assets';
  const isItAssets = mainCategory === 'IT Assets';
  const isItPrimaryDevice = isItAssets && ['Laptop', 'Desktop'].includes(formData.assetType);
  const isItPeripheral = isItAssets && (PERIPHERAL_TYPES as readonly string[]).includes(formData.assetType);
  const showDynamicSpecs = !!(
    activeTypeDef &&
    !activeTypeDef.useLegacyItForm &&
    activeTypeDef.fields.length > 0
  );
  const showLegacyItSpecs = !!(activeTypeDef?.useLegacyItForm && isItPrimaryDevice);

  const isVehicle = mainCategory === 'Vehicle Assets';
  const isSoftware = mainCategory === 'Software / License Assets';

  return {
    mainCategory,
    isItAssets,
    isItPrimaryDevice,
    isItPeripheral,
    useAssetNameField: !isItAssets,
    useBrandModelFields: true,
    requireMacAddress: isItPrimaryDevice,
    showLegacyItSpecs,
    showDynamicSpecs,
    serialLabel: isSoftware ? 'License Key / Serial No.' : isVehicle ? 'Chassis / Engine No.' : 'Serial Number',
    assetCodeLabel: isVehicle ? 'Internal Asset Code' : 'Asset Code',
    makeLabel: isSoftware ? 'Publisher / Brand' : 'Brand / Make',
    modelLabel: isSoftware ? 'Product / Edition' : 'Model',
  };
}

/** Clear fields that must not carry over when asset category / type changes */
export function clearTypeSpecificFields(): Partial<AssetFormData> {
  return {
    assetName: '',
    make: '',
    model: '',
    serialNumber: '',
    assetCode: '',
    macAddress: '',
    ram: '',
    ssd: '',
    cpu: '',
    windowsVersion: '',
    monitorSerial: '',
    monitorAssetCode: '',
    keyboardSerial: '',
    keyboardAssetCode: '',
    mouseSerial: '',
    mouseAssetCode: '',
    upsSerial: '',
    upsAssetCode: '',
    dynamicDetails: {},
    accessories: { mouse: false, keyboard: false, monitor: false, ups: false },
  };
}

export function applyCategorySelection(
  prev: AssetFormData,
  mainCategory: string,
  subCategory: string,
  typeConfig: TypeDefinitionsConfig
): AssetFormData {
  const cleared = { ...prev, ...clearTypeSpecificFields() };

  if (mainCategory === 'IT Assets') {
    const sub = subCategory || 'Laptop / Desktop';
    const def = resolveTypeDefinition(typeConfig, {
      mainCategory,
      subCategory: sub,
      assetType: 'Laptop',
    });
    return {
      ...cleared,
      mainCategory,
      subCategory: sub,
      assetType: 'Laptop',
      assetTypeId: def?.id || 'laptop',
    };
  }

  const def = resolveTypeDefinition(typeConfig, { mainCategory, subCategory });
  return {
    ...cleared,
    mainCategory,
    subCategory,
    assetType: (subCategory || mainCategory) as AssetFormData['assetType'],
    assetTypeId: def?.id || '',
  };
}
