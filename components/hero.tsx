import { ArrowRight, MapPin } from 'lucide-react';
import { Button, ButtonLink } from './ui/button';

function Ridges() {
  return (
    <svg aria-hidden viewBox="0 0 1440 320" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full sm:h-56 lg:h-72">
      <path fill="#EEF6E8" d="M0 210 120 150l90 50 130-110 110 90 70-40 140 100 120-130 100 80 90-60 130 110 110-90 130 70 100-50v170H0Z" />
      <path fill="#5BA829" fillOpacity=".22" d="M0 260 160 200l120 50 150-90 130 80 180-110 150 100 140-70 170 90 120-60 120 50v80H0Z" />
      <path fill="#5BA829" fillOpacity=".38" d="M0 300 200 250l180 40 220-60 200 50 240-70 200 60 200-40v90H0Z" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      <Ridges />
      <div className="container-page relative pt-12 pb-40 sm:pt-20 sm:pb-56 lg:pt-24 lg:pb-72">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-subtle bg-white px-3 py-1.5 text-sm font-medium">
            <MapPin aria-hidden className="size-4 text-green-700" />
            Ružomberok · Liptovský Mikuláš · Jasná · Liptovská Mara
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl lg:leading-[1.08]">
            Koľko dnes stojí váš byt na&nbsp;Liptove?
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            Zadajte adresu. Rozsah ceny uvidíte hneď, presné ocenenie od makléra z vašej lokality do 24 hodín. Bez záväzku.
          </p>
          <form action="/predat-nehnutelnost/ocenenie/" method="get" className="mt-8 rounded-2xl border border-subtle bg-white p-2.5 shadow-lift sm:flex sm:items-end sm:gap-2.5">
            <div className="flex-1">
              <label htmlFor="hero-adresa" className="block px-3 pt-1.5 text-sm font-medium">Adresa nehnuteľnosti</label>
              <input
                id="hero-adresa"
                name="adresa"
                type="text"
                required
                minLength={3}
                autoComplete="street-address"
                placeholder="Ulica a číslo, obec"
                className="block min-h-11 w-full rounded-xl bg-transparent px-3 text-lg placeholder:text-muted"
              />
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full sm:mt-0 sm:w-auto">
              Zistiť cenu
              <ArrowRight aria-hidden className="size-5" />
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/predaj/" variant="secondary">Hľadám bývanie</ButtonLink>
            <ButtonLink href="/kariera/" variant="secondary">Som maklér</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
