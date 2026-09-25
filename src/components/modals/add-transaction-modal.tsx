"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";

interface Account {
  id: string;
  name: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
}

interface Person {
  id: string;
  name: string;
}

interface EditableTransaction {
  id: string;
  type: string;
  amount: number;
  account_id: string;
  target_account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  person_id?: string | null;
  description?: string | null;
  date?: string | null;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: "EXPENSE" | "INCOME" | "TRANSFER" | "DEBT";
  transactionToEdit?: EditableTransaction | null;
}

function addBalanceChange(changes: Map<string, number>, accountId: string | null | undefined, amount: number) {
  if (!accountId || amount === 0) return;
  changes.set(accountId, (changes.get(accountId) || 0) + amount);
}

function addTransactionBalanceEffect(changes: Map<string, number>, transaction: EditableTransaction, multiplier: number) {
  const amount = Number(transaction.amount) * multiplier;
  const targetAccountId = transaction.target_account_id ?? transaction.to_account_id;

  if (transaction.type === "EXPENSE") {
    addBalanceChange(changes, transaction.account_id, -amount);
  } else if (transaction.type === "INCOME") {
    addBalanceChange(changes, transaction.account_id, amount);
  } else if (transaction.type === "TRANSFER") {
    addBalanceChange(changes, transaction.account_id, -amount);
    addBalanceChange(changes, targetAccountId, amount);
  }
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "EXPENSE",
  transactionToEdit = null
}: AddTransactionModalProps) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<string>("EXPENSE");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State'leri
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [personId, setPersonId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setActiveTab(transactionToEdit.type || "EXPENSE");
        setAmount(transactionToEdit.amount?.toString() || "");
        setAccountId(transactionToEdit.account_id || "");
        setToAccountId(transactionToEdit.target_account_id ?? transactionToEdit.to_account_id ?? "");
        setCategoryId(transactionToEdit.category_id || "");
        setPersonId(transactionToEdit.person_id || "");
        setDescription(transactionToEdit.description || "");
        
        // Tarih formatını 'YYYY-MM-DD' standardına çevirerek set edelim
        if (transactionToEdit.date) {
          setDate(transactionToEdit.date.split("T")[0]);
        }
      } else {
        setActiveTab(initialTab || "EXPENSE");
        setAmount("");
        setCategoryId("");
        setPersonId("");
        setDescription("");
        setDate(new Date().toISOString().split("T")[0]);
      }
    }
  }, [isOpen, transactionToEdit, initialTab]);

  const fetchFormData = async () => {
    try {
      const [accRes, catRes, perRes] = await Promise.all([
        supabase.from("accounts").select("id, name, balance").order("name"),
        supabase.from("categories").select("id, name, type").order("name"),
        supabase.from("persons").select("id, name").order("name"),
      ]);

      if (accRes.data) {
        setAccounts(accRes.data);
        if (!transactionToEdit && accRes.data.length > 0) {
          setAccountId(accRes.data[0].id);
          if (accRes.data.length > 1) {
            setToAccountId(accRes.data[1].id);
          }
        }
      }

      if (catRes.data) {
        setCategories(catRes.data);
      }

      if (perRes.data) {
        setPersons(perRes.data);
      }
    } catch (err) {
      console.error("Modal verileri yüklenirken hata:", err);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const applyBalanceChanges = async (changes: Map<string, number>) => {
    const adjustments = Array.from(changes.entries()).filter(([, amount]) => amount !== 0);
    if (adjustments.length === 0) return;

    const accountIds = adjustments.map(([accountId]) => accountId);
    const { data: accountsToUpdate, error: accountsError } = await supabase
      .from("accounts")
      .select("id, balance")
      .in("id", accountIds);

    if (accountsError) throw accountsError;
    if (!accountsToUpdate || accountsToUpdate.length !== accountIds.length) {
      throw new Error("Güncellenecek hesaplardan biri bulunamadı.");
    }

    const adjustmentByAccountId = new Map(adjustments);
    const results = await Promise.all(
      accountsToUpdate.map(async (account) => {
        const newBalance = Number(account.balance) + (adjustmentByAccountId.get(account.id) || 0);
        return supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", account.id)
          .select("id");
      })
    );

    const updateError = results.find((result) => result.error)?.error;
    if (updateError) throw updateError;
    if (results.some((result) => !result.data || result.data.length !== 1)) {
      throw new Error("Hesap bakiyesi güncellenemedi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (!numericAmount || numericAmount <= 0) {
      alert("Lütfen geçerli bir tutar girin.");
      return;
    }

    if (!accountId) {
      alert("Lütfen bir hesap seçin.");
      return;
    }

    if (activeTab === "TRANSFER" && accountId === toAccountId) {
      alert("Kaynak ve hedef hesap aynı olamaz.");
      return;
    }

    setLoading(true);

    try {
      if (transactionToEdit && transactionToEdit.id) {
        const updatedTransaction: EditableTransaction = {
          id: transactionToEdit.id,
          type: activeTab,
          amount: numericAmount,
          account_id: accountId,
          target_account_id: activeTab === "TRANSFER" ? toAccountId || null : null,
        };
        const balanceChanges = new Map<string, number>();

        // Eski işlemin etkisini geri alır, yeni işlemin etkisini uygular.
        addTransactionBalanceEffect(balanceChanges, transactionToEdit, -1);
        addTransactionBalanceEffect(balanceChanges, updatedTransaction, 1);

        await applyBalanceChanges(balanceChanges);

        const { error } = await supabase
          .from("transactions")
          .update({
            type: activeTab,
            amount: numericAmount,
            description: description || null,
            date,
            account_id: accountId,
            category_id: categoryId || null,
            target_account_id: updatedTransaction.target_account_id,
          })
          .eq("id", transactionToEdit.id);

        if (error) {
          const rollbackChanges = new Map<string, number>();
          balanceChanges.forEach((change, accountId) => rollbackChanges.set(accountId, -change));
          await applyBalanceChanges(rollbackChanges);
          throw error;
        }
      } else {
        // 2. YENİ EKLEME İŞLEMİ (INSERT)
        const { error } = await supabase
          .from("transactions")
          .insert([
            {
              type: activeTab,
              amount: Number(amount),
              description: description || null,
              date: date,
              account_id: accountId,
              category_id: categoryId || null,
              target_account_id: toAccountId || null,
            },
          ]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Kayıt sırasında hata:", err);
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert("İşlem başarısız: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5">
          <h2 className="text-lg font-bold text-white">Yeni İşlem Ekle</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Butonları */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("EXPENSE");
              setCategoryId("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              activeTab === "EXPENSE"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Gider
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("INCOME");
              setCategoryId("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              activeTab === "INCOME"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Gelir
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("TRANSFER");
              setCategoryId("");
              setPersonId("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              activeTab === "TRANSFER"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Virman
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          {/* Tutar */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Tutar (₺)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-semibold text-lg"
            />
          </div>

          {/* Hesap Seçimi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {activeTab === "TRANSFER" ? "Kaynak Hesap" : "Hesap"}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({Number(acc.balance).toLocaleString("tr-TR")} ₺)
                  </option>
                ))}
              </select>
            </div>

            {activeTab === "TRANSFER" ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Hedef Hesap
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({Number(acc.balance).toLocaleString("tr-TR")} ₺)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Kategori
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">Kategori Seçin (İsteğe Bağlı)</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Kişi Seçimi (Sadece Gelir / Gider için) */}
          {activeTab !== "TRANSFER" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                İlgili Kişi (Borç / Alacak için)
              </label>
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="">Kişi Seçin (İsteğe Bağlı)</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tarih & Açıklama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Tarih
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Açıklama
              </label>
              <input
                type="text"
                placeholder="Örn: Borç verme / Tahsilat"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Kaydediliyor..." : "İşlemi Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
