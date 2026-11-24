export type StaffRole = 'broker' | 'admin' | 'finance';

export interface NavItem { href: string; label: string }

export const ROLE_LABEL: Record<StaffRole, string> = { broker: 'Maklér', admin: 'Admin', finance: 'Financie' };

/** Menu podľa roly. Je to len pohodlie: oprávnenia vynucuje databáza (RLS a funkcie), nie skrytý odkaz. */
export function navFor(role: StaffRole): NavItem[] {
  switch (role) {
    case 'broker':
      return [
        { href: '/crm/ocenenia/', label: 'Moje ocenenia' },
        { href: '/crm/nepridelene/', label: 'Nepridelené' },
        { href: '/crm/nabory/', label: 'Moje nábory' },
      ];
    case 'admin':
      return [
        { href: '/crm/pridelenie/', label: 'Na pridelenie' },
        { href: '/crm/nabory/', label: 'Nábory' },
        { href: '/crm/financovanie/', label: 'Financovanie' },
      ];
    case 'finance':
      return [{ href: '/crm/financovanie/', label: 'Financovanie' }];
  }
}

export function isRole(value: unknown): value is StaffRole {
  return value === 'broker' || value === 'admin' || value === 'finance';
}
