import { describe, expect, it } from 'vitest';
import { CRM_HOME, CRM_LOGIN, crmRedirect } from '../lib/crm/guard';
import { navFor, isRole, ROLE_LABEL } from '../lib/crm/nav';
import { friendlyError, GENERIC_ERROR } from '../lib/crm/errors';

describe('prístup do CRM (crmRedirect)', () => {
  it('neprihlásený ide na prihlásenie', () => {
    expect(crmRedirect('/crm/', false)).toBe(CRM_LOGIN);
    expect(crmRedirect('/crm/ocenenia/', false)).toBe(CRM_LOGIN);
    expect(crmRedirect('/crm/financovanie/abc/', false)).toBe(CRM_LOGIN);
  });
  it('prihlasovacia stránka je pre neprihláseného dostupná, s lomkou aj bez nej', () => {
    expect(crmRedirect('/crm/login/', false)).toBeNull();
    expect(crmRedirect('/crm/login', false)).toBeNull();
  });
  it('prihlásený z prihlásenia ide na úvod, inde ostáva', () => {
    expect(crmRedirect('/crm/login/', true)).toBe(CRM_HOME);
    expect(crmRedirect('/crm/nepridelene/', true)).toBeNull();
  });
  it('podobná cesta nie je prihlasovacia stránka', () => {
    expect(crmRedirect('/crm/login-x/', false)).toBe(CRM_LOGIN);
    expect(crmRedirect('/crm/login/../ocenenia/', false)).toBe(CRM_LOGIN);
  });
});

describe('menu podľa roly', () => {
  it('maklér má svoje obrazovky, nie pridelenie ani financovanie', () => {
    const hrefs = navFor('broker').map((i) => i.href);
    expect(hrefs).toEqual(['/crm/ocenenia/', '/crm/nepridelene/', '/crm/nabory/']);
  });
  it('admin má pridelenie, nábory a financovanie', () => {
    expect(navFor('admin').map((i) => i.href)).toEqual(['/crm/pridelenie/', '/crm/nabory/', '/crm/financovanie/']);
  });
  it('financie majú len financovanie', () => {
    expect(navFor('finance').map((i) => i.href)).toEqual(['/crm/financovanie/']);
  });
  it('každá rola má popis a neznáma hodnota nie je rola', () => {
    expect(Object.keys(ROLE_LABEL).sort()).toEqual(['admin', 'broker', 'finance']);
    expect(isRole('broker')).toBe(true);
    expect(isRole('superadmin')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe('chybové hlásenia', () => {
  it('známe hlásenie z databázy sa zobrazí', () => {
    expect(friendlyError('Limit: 1 prevzatie z Nepridelených za 24 hodín')).toBe('Limit: 1 prevzatie z Nepridelených za 24 hodín');
    expect(friendlyError('  Ocenenie nie je voľné alebo patrí inej pobočke ')).toBe('Ocenenie nie je voľné alebo patrí inej pobočke');
  });
  it('technická alebo neznáma chyba sa nahradí všeobecnou vetou (nič interné sa neukáže)', () => {
    expect(friendlyError('permission denied for function audit')).toBe(GENERIC_ERROR);
    expect(friendlyError('duplicate key value violates unique constraint "valuations_source_source_id_key"')).toBe(GENERIC_ERROR);
    expect(friendlyError('')).toBe(GENERIC_ERROR);
    expect(friendlyError(undefined)).toBe(GENERIC_ERROR);
    expect(friendlyError(null)).toBe(GENERIC_ERROR);
  });
});
