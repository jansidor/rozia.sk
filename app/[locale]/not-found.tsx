import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="tabular font-display text-6xl font-bold text-green-500" aria-hidden>404</p>
      <h1 className="mt-4 text-3xl sm:text-4xl">Túto stránku sme nenašli</h1>
      <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
        Ponuka mohla byť predaná alebo stiahnutá, prípadne zvoleným filtrom nič nezodpovedá.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/predaj/">Aktuálna ponuka</ButtonLink>
        <ButtonLink href="/" variant="secondary">Domov</ButtonLink>
      </div>
    </div>
  );
}
