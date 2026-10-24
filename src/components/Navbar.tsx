'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Boxes, ChevronDown } from 'lucide-react';
import { useAssessmentStore } from '@/store/useAssessmentStore';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/assessment', label: '01  Estate discovery' },
  { href: '/calculator', label: '02  TCO calculator' },
  { href: '/report', label: '03  Migration report' },
];

export default function Navbar() {
  const path = usePathname();
  const estate = useAssessmentStore((state) => state.estate);
  const loadPreset = useAssessmentStore((state) => state.loadPreset);
  const [open, setOpen] = useState(false);
  useEffect(() => { void useAssessmentStore.persist.rehydrate(); }, []);
  return <header className="print:hidden sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-3 px-5 py-4 lg:px-8">
      <Link href="/" className="flex items-center gap-3 text-white" aria-label="Exit Architecture home">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint text-ink"><Boxes size={20} strokeWidth={2.5} /></span>
        <span className="text-sm font-bold tracking-[0.16em]">EXIT<span className="text-mint">/</span>ARCHITECTURE</span>
      </Link>
      <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto text-xs font-semibold md:order-2 md:w-auto md:flex-1 md:justify-center">
        {links.map((link) => <Link key={link.href} href={link.href} className={`whitespace-nowrap rounded-md px-3 py-2.5 transition ${path === link.href ? 'bg-white/10 text-mint' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{link.label}</Link>)}
      </nav>
      <div className="order-2 ml-auto flex items-center gap-2 md:order-3 md:ml-0">
        <span className="rounded-md border border-mint/30 bg-mint/10 px-2.5 py-1.5 text-[11px] font-bold tracking-widest text-mint">{estate.currency}</span>
        <div className="relative">
          <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10" aria-expanded={open}>Presets <ChevronDown size={14} /></button>
          {open && <div className="absolute right-0 top-10 w-64 rounded-lg border border-line bg-panel p-1 shadow-2xl">
            {([['mid_market', 'Mid-Market · 24 hosts'], ['large_enterprise', 'Large Enterprise · 96 hosts'], ['hci_heavy', 'vSAN HCI Heavy · 42 hosts']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => { loadPreset(key); setOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10">{label}</button>)}
          </div>}
        </div>
        <Link href="/assessment" className="hidden items-center gap-1 text-xs font-bold text-mint lg:flex">Start <ArrowUpRight size={14} /></Link>
      </div>
    </div>
  </header>;
}
