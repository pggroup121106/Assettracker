export interface CategoryRecord {
  'Category Name': string;
  'Description': string;
  'Created Date': string;
}

export interface AssetTypeRecord {
  'Type ID': string;
  'Type Name': string;
  'Main Category': string;
  'Config JSON': string; // Stringified JSON config
}

export interface AssetExtraItemRecord {
  'Record ID': string;
  'Parent Asset ID': string;
  'Item Name': string;
  'Quantity': number;
  'Serial Number': string;
  'Condition': string;
  'Status': string;
  'Remarks': string;
  'Updated Date': string;
}

export interface AssignmentRecord {
  'Assignment ID': string;
  'Asset/Inventory ID': string;
  'Type': 'Asset' | 'Inventory';
  'Assignee Name': string;
  'Assignee ID': string;
  'Department': string;
  'Contact Number': string;
  'Assigned Date': string;
  'Assigned By': string;
  'Status': 'Active' | 'Returned';
  'Remarks': string;
}

export interface AssignmentHistoryRecord {
  'Record ID': string;
  'Asset ID': string;
  'Action': string;
  'Employee ID': string;
  'Employee Name': string;
  'Contact Number': string;
  'Assigned Date': string;
  'Returned Date': string;
  'Assigned By': string;
  'Remarks': string;
  'From Employee ID': string;
  'From Employee Name': string;
}

export interface MissingItemRecord {
  'Record ID': string;
  'Parent Asset ID': string;
  'Parent Asset Name': string;
  'Missing Item Name': string;
  'Assigned Person': string;
  'Missing Date': string;
  'Status': 'Missing' | 'Recovered';
  'Remarks': string;
  'Recovered Date': string;
  'Recovered By': string;
}

export interface DamagedItemRecord {
  'Record ID': string;
  'Asset ID': string;
  'Asset Name': string;
  'Damage Date': string;
  'Damage Reason': string;
  'Reported By': string;
  'Repair Required': 'Yes' | 'No';
  'Estimated Cost': number;
  'Status': 'Reported' | 'In Repair' | 'Scrapped' | 'Repaired';
  'Remarks': string;
}

export interface AuditLogRecord {
  'Log ID': string;
  'User Email': string;
  'Action': string;
  'Target ID': string;
  'Date & Time': string;
  'Old Value': string;
  'New Value': string;
  'Remarks': string;
}
