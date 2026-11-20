import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, User } from 'lucide-react';
import type { Agent } from '@/lib/types';
import { telHref } from '@/lib/format';

export function AgentAvatar({ agent, size = 96 }: { agent: Agent; size?: number }) {
  return agent.photoUrl ? (
    <Image src={agent.photoUrl} alt={`${agent.name}, realitný maklér`} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-green-50 text-green-700" style={{ width: size, height: size }}>
      <User style={{ width: size / 2.2, height: size / 2.2 }} strokeWidth={1.5} />
    </span>
  );
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className="relative flex h-full flex-col rounded-2xl border border-subtle bg-white p-6 shadow-card transition-shadow hover:shadow-lift has-[h3_a:focus-visible]:outline-2 has-[h3_a:focus-visible]:outline-offset-2 has-[h3_a:focus-visible]:outline-green-950">
      <div className="flex items-center gap-4">
        <AgentAvatar agent={agent} size={80} />
        <div>
          <h3 className="text-xl">
            <Link href={`/makleri/${agent.slug}/`} className="card-link outline-none">{agent.name}</Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin aria-hidden className="size-4 shrink-0" />
            {agent.area}
          </p>
        </div>
      </div>
      {agent.soldLast12m !== null && agent.soldLast12m > 0 && (
        <p className="mt-5 text-sm">
          <strong className="tabular font-display text-2xl">{agent.soldLast12m}</strong>{' '}
          <span className="text-muted">predaných za 12 mesiacov</span>
        </p>
      )}
      <a href={telHref(agent.phone)} className="tabular relative z-10 mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-4 font-semibold text-green-700 underline-offset-4 hover:text-green-950 hover:underline">
        <Phone aria-hidden className="size-4" />
        {agent.phone}
      </a>
    </article>
  );
}

export function AgentGrid({ agents }: { agents: Agent[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((a) => (
        <li key={a.id}><AgentCard agent={a} /></li>
      ))}
    </ul>
  );
}
