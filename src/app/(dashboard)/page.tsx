'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Plus, 
  ArrowLeftRight,
  ReceiptText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AddTransactionModal } from '@/components/modals/add-transaction-modal';
import { Account, Transaction } from '@/types/database';
import { AddAccountModal } from '@/components/modals/add-account-modal';

interface MonthlyExpenseTransaction {
  amount: number;
  category: { name: string } | { name: string }[] | null;
}

function getCurrentMonthRange() {
  const now = new Date();
  const toDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    start: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    label: new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(now),
  };
}

export default function DashboardPage() {
  const supabase = createClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'DEBT'>('EXPENSE');
  
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenseTransaction[]>([]);
  const [monthlyExpensesError, setMonthlyExpensesError] = useState(false);

  // Verileri Supabase'den Çek
  const fetchDashboardData = async () => {
    setLoading(true);

    const { start, end } = getCurrentMonthRange();
    setMonthlyExpensesError(false);

    const [accountsRes, transactionsRes, monthlyExpensesRes] = await Promise.all([
      supabase.from('accounts').select('*').order('name'),
      supabase.from('transactions')
        .select(`
          *,
          account:accounts!account_id(name),
          category:categories(name)
        `)
        .order('date', { ascending: false })
        .limit(10),
      supabase.from('transactions')
        .select('amount, category:categories(name)')
        .eq('type', 'EXPENSE')
        .gte('date', start)
        .lt('date', end)
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (monthlyExpensesRes.error) {
      console.error('Aylık gider özeti yüklenirken hata:', monthlyExpensesRes.error);
      setMonthlyExpensesError(true);
    } else {
      setMonthlyExpenses((monthlyExpensesRes.data ?? []) as MonthlyExpenseTransaction[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openModal = (tab: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'DEBT') => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  // Hesaplamalar
  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
  const monthlyExpensesByCategory = monthlyExpenses.reduce<Record<string, number>>((summary, transaction) => {
    const category = Array.isArray(transaction.category) ? transaction.category[0] : transaction.category;
    const categoryName = category?.name || 'Kategorisiz';
    summary[categoryName] = (summary[categoryName] || 0) + Number(transaction.amount || 0);
    return summary;
  }, {});
  const monthlyExpenseCategories = Object.entries(monthlyExpensesByCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((first, second) => second.amount - first.amount);
  const monthlyExpenseTotal = monthlyExpenseCategories.reduce((total, category) => total + category.amount, 0);
  const currentMonthLabel = getCurrentMonthRange().label;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* BAŞLIK VE HIZLI AKSİYONLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Finansal Özet</h1>
          <p className="text-sm text-slate-400">Aile bütçesinin anlık durumu ve güncel bakiyeler.</p>
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button 
            onClick={() => openModal('TRANSFER')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700/80 sm:flex-none sm:justify-start"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            <span>Virman / Kart Öde</span>
          </button>
          
          <button 
            onClick={() => openModal('EXPENSE')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 sm:flex-none sm:justify-start"
          >
            <Plus className="w-4 h-4" />
            <span>Harcama / Gelir Ekle</span>
          </button>
        </div>
      </div>

      {/* ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Toplam Bakiye</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">
            {loading ? '...' : `₺${totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aktif Hesap Sayısı</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : accounts.length}</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Son İşlem Sayısı</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : transactions.length}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-400">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bu ayki harcamalar</h2>
              <p className="text-sm text-slate-400">{currentMonthLabel} ayındaki giderleriniz kategoriye göre.</p>
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 sm:text-right">
            <p className="text-xs font-medium text-rose-300">Toplam harcama</p>
            <p className="text-lg font-bold text-rose-400">
              {loading ? '...' : `₺${monthlyExpenseTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Aylık harcamalar yükleniyor...</p>
        ) : monthlyExpensesError ? (
          <p className="text-sm text-rose-300">Aylık harcama özeti yüklenemedi. Lütfen tekrar deneyin.</p>
        ) : monthlyExpenseCategories.length === 0 ? (
          <p className="text-sm text-slate-500">Bu ay için kaydedilmiş gider bulunmuyor.</p>
        ) : (
          <div className="space-y-4">
            {monthlyExpenseCategories.map((category) => {
              const percentage = monthlyExpenseTotal > 0 ? (category.amount / monthlyExpenseTotal) * 100 : 0;

              return (
                <div key={category.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-200">{category.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-white">
                      ₺{category.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      <span className="ml-1.5 text-xs font-medium text-slate-500">%{percentage.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-rose-500 transition-[width]" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* İKİLİ IZGARA: HESAPLAR VE SON İŞLEMLER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* HESAPLAR LİSTESİ */}
        <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Hesap Bakiyeleri</h2>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Hesap Ekle</span>
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-slate-500">Hesaplar yükleniyor...</p>
            ) : accounts.length === 0 ? (
              <p className="text-xs text-slate-500">Henüz eklenmiş bir hesap yok.</p>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{acc.name}</p>
                    <p className="text-xs text-slate-500">{acc.type}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white">
                    ₺{Number(acc.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SON İŞLEMLER TABLOSU */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Son İşlemler</h2>
          
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-xs text-slate-500">İşlemler yükleniyor...</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-slate-500">Henüz kaydedilmiş işlem bulunmuyor.</p>
            ) : (
              <table className="min-w-[580px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                    <th className="pb-3">Tarih</th>
                    <th className="pb-3">Açıklama / Kategori</th>
                    <th className="pb-3">Hesap</th>
                    <th className="pb-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3.5 text-xs text-slate-400">{tx.date}</td>
                      <td className="py-3.5">
                        <p className="font-medium text-slate-200">{tx.description || 'Açıklama Yok'}</p>
                        <span className="text-xs text-slate-500">{tx.category?.name || tx.type}</span>
                      </td>
                      <td className="py-3.5 text-xs text-slate-400">{tx.account?.name}</td>
                      <td className={`py-3.5 text-right font-bold ${
                        tx.type === 'INCOME' ? 'text-emerald-400' : tx.type === 'EXPENSE' ? 'text-rose-400' : 'text-indigo-400'
                      }`}>
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                        ₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* MODAL */}
      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchDashboardData(); // Modal kapandığında verileri tazele
        }} 
        initialTab={modalTab}
        onSuccess={fetchDashboardData}
      />
      <AddAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={fetchDashboardData} // Eklendikten sonra Dashboard listesini yeniler
      />
    </div>
  );
}
