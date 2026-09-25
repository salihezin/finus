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
  Plus,
  CheckSquare,
  Square,
  Filter
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
  target_account_id?: string | null;
  accounts?: { name: string } | null;
  categories?: { name: string } | null;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function TransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Toplu Seçim State'leri
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetCategory, setTargetCategory] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modal State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filtre State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [onlyUncategorized, setOnlyUncategorized] = useState(false); // Yeni Kategorisiz Filtresi

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [txRes, accRes, catRes] = await Promise.all([
          supabase
              .from("transactions")
              .select(`
              *,
              accounts:accounts!transactions_account_id_fkey (name),
              categories (name)
              `)
              .order("date", { ascending: false }),
          supabase.from("accounts").select("id, name").order("name"),
          supabase.from("categories").select("id, name").order("name")
        ]);

        if (txRes.data) setTransactions(txRes.data as any);
        if (accRes.data) setAccounts(accRes.data);
        if (catRes.data) setCategories(catRes.data);
    } catch (err) {
        console.error("Veriler çekilirken hata oluştu:", err);
    } finally {
        setLoading(false);
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
      const matchesUncategorized = !onlyUncategorized || !tx.category_id; // Kategorisiz filtresi kontrolü

      return matchesSearch && matchesType && matchesAccount && matchesUncategorized;
    });
  }, [transactions, searchQuery, selectedType, selectedAccount, onlyUncategorized]);

  // Tekil Checkbox Seçimi
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Tüm Filtrelenmişleri Seç / Kaldır
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  // Toplu Kategori Güncelleme
  const handleBulkCategoryUpdate = async () => {
    if (!targetCategory || selectedIds.length === 0) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: targetCategory })
        .in("id", selectedIds);

      if (error) throw error;

      alert(`${selectedIds.length} adet işlemin kategorisi başarıyla güncellendi!`);
      setSelectedIds([]);
      setTargetCategory("");
      await fetchData(); // Listeyi yenile
    } catch (err: any) {
      console.error("Toplu güncelleme hatası:", err);
      alert("Güncelleme sırasında hata oluştu: " + err.message);
    } finally {
      setIsUpdating(false);
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
      } else if (tx.type === "TRANSFER" && tx.target_account_id) {
        newBalance += Number(tx.amount);
        
        const { data: toAccData } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", tx.target_account_id)
          .single();
        
        if (toAccData) {
          await supabase
            .from("accounts")
            .update({ balance: Number(toAccData.balance) - Number(tx.amount) })
            .eq("id", tx.target_account_id);
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
      setSelectedIds((prev) => prev.filter((id) => id !== tx.id));
    } catch (err) {
      console.error("İşlem silinirken hata oluştu:", err);
      alert("İşlem silinemedi.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-100 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">İşlem Geçmişi</h1>
          <p className="text-sm text-slate-400">
            Tüm harcama, gelir ve virman kayıtlarınızı inceleyin ve yönetin.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <CsvImportButton 
            accountId="2242c863-6fa0-4027-b62d-61665c01750f" 
            onImportComplete={fetchData} 
          />
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni İşlem Ekle
          </button>
        </div>
      </div>

      {/* Arama & Filtreleme Barı */}
      <div className="bg-slate-900/85 backdrop-blur-sm p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
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
          {/* Kategorisiz Filtresi Çekici */}
          <button
            onClick={() => setOnlyUncategorized(!onlyUncategorized)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-sm rounded-xl border transition-all cursor-pointer font-medium ${
              onlyUncategorized 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10" 
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Filter className="w-4 h-4" />
            {onlyUncategorized ? "Sadece Kategorisizler" : "Tüm Kategoriler"}
          </button>

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

      {/* TOPLU İŞLEM BARı (Sadece seçim yapıldığında aktif olur) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-fadeIn">
          <div className="text-sm font-medium text-indigo-200 flex items-center gap-2">
            <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
              {selectedIds.length}
            </span>
            işlem seçildi
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-all flex-1 sm:w-64"
            >
              <option value="">Hedef Kategori Seç...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkCategoryUpdate}
              disabled={isUpdating || !targetCategory}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-indigo-600/20"
            >
              {isUpdating ? "Güncelleniyor..." : "Kategoriyi Uygula"}
            </button>
          </div>
        </div>
      )}

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
            <table className="min-w-[850px] w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                  <th className="p-4 w-12 text-center">
                    <button 
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Tümünü Seç / Kaldır"
                    >
                      {filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
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
                  const isSelected = selectedIds.includes(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      className={`transition-colors ${isSelected ? "bg-indigo-950/20" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => toggleSelect(tx.id)}
                          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

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
                          {tx.categories?.name ? (
                            <span>{tx.categories.name}</span>
                          ) : (
                            <span className="text-amber-400 font-medium">Kategorisiz</span>
                          )}
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
    </div>
  );
}
