'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  CalendarClock, 
  Users, 
  PiggyBank 
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { name: 'Ana Sayfa', href: '/', icon: LayoutDashboard },
  { name: 'Hesaplar & Kartlar', href: '/accounts', icon: Wallet },
  { name: 'İşlemler', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Taksitler', href: '/installments', icon: CalendarClock },
  { name: 'Kişiler', href: '/persons', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 p-4 text-slate-300 md:flex">
        <div className="space-y-8">
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-3 pt-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Finus</h1>
            <p className="text-xs text-slate-400 font-medium">Aile Bütçesi</p>
          </div>
        </div>

        {/* Navigasyon Linkleri */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive ? 'text-white' : 'text-slate-400')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profil Alt Alanı */}
      <div className="pt-4 border-t border-slate-800 px-2">
        <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-xl border border-slate-800">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-xs flex items-center justify-center border border-emerald-500/20">
            S&N
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Salih & Nihal</p>
            <p className="text-[10px] text-slate-400 truncate">Ortak Bütçe</p>
          </div>
        </div>
      </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-800 bg-slate-900/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-indigo-400' : 'text-slate-400'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="w-full truncate text-center">{item.name.replace('Hesaplar & Kartlar', 'Hesaplar')}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
