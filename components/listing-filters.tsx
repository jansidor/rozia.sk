import { SlidersHorizontal } from 'lucide-react';
import { Button, ButtonLink } from './ui/button';
import { inputStyles } from './ui/field';

export interface FilterValues {
  'cena-do'?: string;
  izby?: string;
  'plocha-od'?: string;
  sort?: string;
}

/** Filtre žijú v URL (GET formulár, funguje aj bez JavaScriptu). Parametre sú v robots.txt zakázané. */
export function ListingFilters({ action, values, rent }: { action: string; values: FilterValues; rent: boolean }) {
  const active = Object.values(values).some(Boolean);
  const label = 'mb-1.5 block text-sm font-medium';
  return (
    <form action={action} method="get" aria-label="Filter ponuky" className="rounded-2xl border border-subtle bg-white p-4 shadow-card sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="f-cena" className={label}>{rent ? 'Nájom do (€/mes.)' : 'Cena do (€)'}</label>
          <input id="f-cena" name="cena-do" type="number" inputMode="numeric" min={0} step={rent ? 50 : 5000} defaultValue={values['cena-do']} placeholder={rent ? 'napr. 700' : 'napr. 180000'} className={inputStyles} />
        </div>
        <div>
          <label htmlFor="f-izby" className={label}>Počet izieb</label>
          <select id="f-izby" name="izby" defaultValue={values.izby ?? ''} className={inputStyles}>
            <option value="">Nezáleží</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4 a viac</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-plocha" className={label}>Plocha od (m²)</label>
          <input id="f-plocha" name="plocha-od" type="number" inputMode="numeric" min={0} step={5} defaultValue={values['plocha-od']} placeholder="napr. 60" className={inputStyles} />
        </div>
        <div>
          <label htmlFor="f-sort" className={label}>Zoradiť</label>
          <select id="f-sort" name="sort" defaultValue={values.sort ?? ''} className={inputStyles}>
            <option value="">Najnovšie</option>
            <option value="cena-asc">Od najlacnejších</option>
            <option value="cena-desc">Od najdrahších</option>
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="flex-1 lg:flex-none">
            <SlidersHorizontal aria-hidden className="size-4" />
            Filtrovať
          </Button>
          {active && <ButtonLink href={action} variant="quiet">Zrušiť filter</ButtonLink>}
        </div>
      </div>
    </form>
  );
}
