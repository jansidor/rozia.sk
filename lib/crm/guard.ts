/** Rozhodnutie o prístupe do CRM (čistá funkcia, aby sa dala testovať). Vráti cestu presmerovania alebo null. */
export const CRM_HOME = '/crm/';
export const CRM_LOGIN = '/crm/login/';

export function crmRedirect(pathname: string, signedIn: boolean): string | null {
  const isLogin = pathname === '/crm/login' || pathname === CRM_LOGIN;
  if (!signedIn && !isLogin) return CRM_LOGIN;
  if (signedIn && isLogin) return CRM_HOME;
  return null;
}
