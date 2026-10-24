'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { TargetPlatform } from '@/types/assessment';
import { TARGETS, TARGET_LABELS } from '@/types/assessment';

export function Eyebrow({ children }: { children: ReactNode }) { return <div className="eyebrow">{children}</div>; }
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <div className={`panel ${className}`}>{children}</div>; }
export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} className="btn-primary">{children}<ArrowRight size={17} /></Link>; }
export function Metric({ label, value, detail, tone = 'mint' }: { label: string; value: string; detail?: string; tone?: 'mint' | 'amber' | 'sky' }) { return <div className="panel min-h-[145px]"><div className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">{label}</div><div className={`mt-4 text-3xl font-bold tracking-tight ${tone === 'amber' ? 'text-amber' : tone === 'sky' ? 'text-sky' : 'text-mint'}`}>{value}</div>{detail && <div className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</div>}</div>; }
export function TargetTabs({ value, onChange }: { value: TargetPlatform; onChange: (target: TargetPlatform) => void }) { return <div role="tablist" aria-label="Target platform" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{TARGETS.map((target) => <button key={target} role="tab" aria-selected={value === target} type="button" onClick={() => onChange(target)} className={`rounded-lg border px-3 py-3 text-left text-xs font-bold transition ${value === target ? 'border-mint bg-mint/15 text-mint' : 'border-line bg-panel text-slate-300 hover:border-slate-400'}`}>{TARGET_LABELS[target]}</button>)}</div>; }
export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) { return <div aria-label={label} className="inline-flex flex-wrap rounded-lg border border-line bg-ink p-1">{options.map((option) => <button key={String(option.value)} type="button" onClick={() => onChange(option.value)} className={`rounded-md px-3 py-2 text-xs font-bold transition ${value === option.value ? 'bg-mint text-ink' : 'text-slate-400 hover:text-white'}`}>{option.label}</button>)}</div>; }
