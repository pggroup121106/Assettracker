import type { Asset } from '../types';
import type { Employee } from '../types/employee';
import { normalizeEmail } from './utils';

function normId(id?: string) {
  return String(id || '').trim().toUpperCase();
}

/** Assets currently linked to this employee (by ID, email, or name). */
export function assetsForEmployee(assets: Asset[], employee: Employee): Asset[] {
  const eid = normId(employee.employeeId);
  const email = normalizeEmail(employee.email);
  const name = String(employee.name || '').trim().toLowerCase();

  return assets.filter((a) => {
    const aid = normId(a.employeeId);
    if (eid && aid && eid === aid) return true;
    if (email && normalizeEmail(a.contactEmail) === email) return true;
    if (name && String(a.contactName || '').trim().toLowerCase() === name) return true;
    return false;
  });
}

export function activeAssignedAssets(assets: Asset[]): Asset[] {
  return assets.filter(
    (a) =>
      a.status === 'Assigned' ||
      a.status === 'In Use' ||
      (!!a.employeeId?.trim() || !!a.contactName?.trim())
  );
}
