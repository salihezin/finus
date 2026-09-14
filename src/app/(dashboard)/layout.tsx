import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Ana İçerik Alanı */}
      <main className="flex-1 pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}