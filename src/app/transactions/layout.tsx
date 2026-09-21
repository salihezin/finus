import { Sidebar } from '@/components/layout/sidebar';
import { requireAuthenticatedUser } from '@/lib/supabase/auth';

export default async function TransactionsLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedUser();

  return (
    <div className="flex min-h-screen w-full bg-slate-950 md:h-screen md:overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-slate-950 pb-24 md:pb-0">{children}</main>
    </div>
  );
}
