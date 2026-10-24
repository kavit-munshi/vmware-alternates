import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = { title: 'Exit Architecture | VMware Migration Advisory', description: 'Enterprise VMware exit assessment, migration TCO and executive blueprint.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Navbar />{children}<footer className="print:hidden border-t border-line px-5 py-8 text-center text-xs text-slate-500">EXIT / ARCHITECTURE · Illustrative planning estimates · Validate commercial terms and technical cutover with your delivery team.</footer></body></html>;
}
