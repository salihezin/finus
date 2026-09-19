"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Trash2, 
  Edit2,
  Calendar,
  Wallet,
  Tag,
  Plus
} from "lucide-react";
import { AddTransactionModal } from "@/components/modals/add-transaction-modal";
import CsvImportButton from "./components/CsvImportButton";

interface Transaction {
  id: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
  description: string | null;
  date: string;
  account_id: string;
  category_id: string | null;
  to_account_id?: string | null;
  accounts?: { name: string } | null;
  categories?: { name: string } | null;
}

interface Account {
  id: string;
  name: string;
}

export default function TransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filtre State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [txRes, accRes] = await Promise.all([
        supabase
            .from("transactions")
            .select(`
            *,
            accounts:accounts!transactions_account_id_fkey (name),
            categories (name)
            `)
            .order("date", { ascending: false }),
        supabase.from("accounts").select("id, name").order("name")
        ]);

        if (txRes.data) setTransactions(txRes.data as any);
        if (accRes.data) setAccounts(accRes.data);
    } catch (err) {
        console.error("Veriler çekilirken hata oluştu:", err);
    } finally {
        setLoading(false);
    }
   };

  // Yeni Ekle veya Düzenle Modalını Aç
  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  // İşlem Silme & Bakiye İadesi
  const handleDelete = async (tx: Transaction) => {
    if (!confirm("Bu işlemi silmek istediğinize emin misiniz? Bakiye geri ayarlanacaktır.")) return;

    try {
      const { data: accData, error: accErr } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", tx.account_id)
        .single();

      if (accErr || !accData) throw new Error("Hesap bakiyesi okunamadı.");

      let newBalance = Number(accData.balance);

      if (tx.type === "EXPENSE") {
        newBalance += Number(tx.amount);
      } else if (tx.type === "INCOME") {
        newBalance -= Number(tx.amount);
      } else if (tx.type === "TRANSFER" && tx.to_account_id) {
        newBalance += Number(tx.amount);
        
        const { data: toAccData } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", tx.to_account_id)
          .single();
        
        if (toAccData) {
          await supabase
            .from("accounts")
            .update({ balance: Number(toAccData.balance) - Number(tx.amount) })
            .eq("id", tx.to_account_id);
        }
      }

      await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", tx.account_id);

      const { error: deleteErr } = await supabase
        .from("transactions")
        .delete()
        .eq("id", tx.id);

      if (deleteErr) throw deleteErr;

      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    } catch (err) {
      console.error("İşlem silinirken hata oluştu:", err);
      alert("İşlem silinemedi.");
    }
  };

  // Filtrelenmiş liste
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = 
        (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.categories?.name && tx.categories.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === "ALL" || tx.type === selectedType;
      const matchesAccount = selectedAccount === "ALL" || tx.account_id === selectedAccount;

      return matchesSearch && matchesType && matchesAccount;
    });
  }, [transactions, searchQuery, selectedType, selectedAccount]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">İşlem Geçmişi</h1>
          <p className="text-sm text-slate-400">
            Tüm harcama, gelir ve virman kayıtlarınızı inceleyin ve yönetin.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          CSV Ekle
        </button>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni İşlem Ekle
        </button>
      </div>

      {/* Arama & Filtreleme Barı */}
      <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Açıklama veya kategori ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option value="ALL">Tüm Türler</option>
            <option value="EXPENSE">Giderler</option>
            <option value="INCOME">Gelirler</option>
            <option value="TRANSFER">Virman / Transfer</option>
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option value="ALL">Tüm Hesaplar</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tablo Konteyneri */}
      <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Kriterlere uygun herhangi bir işlem kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                  <th className="p-4">İşlem</th>
                  <th className="p-4">Açıklama / Kategori</th>
                  <th className="p-4">Hesap</th>
                  <th className="p-4">Tarih</th>
                  <th className="p-4 text-right">Tutar</th>
                  <th className="p-4 text-center">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => {
                  const isExpense = tx.type === "EXPENSE";
                  const isIncome = tx.type === "INCOME";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              isExpense
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : isIncome
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            }`}
                          >
                            {isExpense ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : isIncome ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowLeftRight className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-semibold text-slate-200">
                            {isExpense ? "Gider" : isIncome ? "Gelir" : "Transfer"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-slate-200">
                          {tx.description || "Açıklama yok"}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {tx.categories?.name || "Kategorisiz"}
                        </div>
                      </td>

                      <td className="p-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-slate-500" />
                          {tx.accounts?.name || "Bilinmiyor"}
                        </div>
                      </td>

                      <td className="p-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(tx.date).toLocaleDateString("tr-TR")}
                        </div>
                      </td>

                      <td className={`p-4 text-right font-bold ${
                        isExpense 
                          ? "text-rose-400" 
                          : isIncome 
                          ? "text-emerald-400" 
                          : "text-indigo-400"
                      }`}>
                        {isExpense ? "-" : isIncome ? "+" : ""}
                        {Number(tx.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(tx)}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer"
                            title="İşlemi Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="İşlemi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        initialTab="EXPENSE"
        transactionToEdit={editingTransaction}
      />
      <CsvImportButton accountId={selectedAccount} />
    </div>
  );
}