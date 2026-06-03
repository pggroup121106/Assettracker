export type InventoryStatus = 'Available' | 'Assigned' | 'Missing' | 'Damaged';

export interface InventoryItem {
  itemId: string;
  assetCode: string;
  itemName: string;
  brandName: string;
  model: string;
  serialNumber: string;
  category: string;
  status: InventoryStatus;
  quantity: number;
  minStock: number;
  createdAt?: string;
  updatedAt?: string;
}

export const EMPTY_INVENTORY_ITEM = (): InventoryItem => ({
  itemId: '',
  assetCode: '',
  itemName: '',
  brandName: '',
  model: '',
  serialNumber: '',
  category: 'IT Assets',
  status: 'Available',
  quantity: 1,
  minStock: 0,
});
