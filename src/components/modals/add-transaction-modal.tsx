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

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab: "EXPENSE" | "INCOME" | "TRANSFER" | "DEBT";
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab,
}: Readonly<AddTransactionModalProps>) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME" | "TRANSFER" | "DEBT">(initialTab);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State'leri
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState(""); // Virman için alıcı hesap
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen]);

  const fetchFormData = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        supabase.from("accounts").select("id, name, balance").order("name"),
        supabase.from("categories").select("id, name, type").order("name"),
      ]);

      if (accRes.data) {
        setAccounts(accRes.data);
        if (accRes.data.length > 0) {
          setAccountId(accRes.data[0].id);
          if (accRes.data.length > 1) {
            setToAccountId(accRes.data[1].id);
          }
        }
      }

      if (catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error("Modal verileri yüklenirken hata:", err);
    }
  };

  if (!isOpen) return null;

  // Aktif sekmeye göre kategorileri filtrele
  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(amount);

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
      // 1. İşlem Kaydını Ekle
      const transactionPayload: any = {
        type: activeTab,
        amount: numericAmount,
        account_id: accountId,
        category_id: activeTab === "TRANSFER" ? null : categoryId || null,
        description: description || null,
        date: date,
      };

      if (activeTab === "TRANSFER") {
        transactionPayload.to_account_id = toAccountId;
      }

      const { error: txError } = await supabase
        .from("transactions")
        .insert([transactionPayload]);

      if (txError) throw txError;

      // 2. Hesap Bakiyelerini Güncelle
      const sourceAccount = accounts.find((a) => a.id === accountId);
      if (!sourceAccount) throw new Error("Hesap bulunamadı.");

      let newSourceBalance = Number(sourceAccount.balance);

      if (activeTab === "EXPENSE") {
        newSourceBalance -= numericAmount;
      } else if (activeTab === "INCOME") {
        newSourceBalance += numericAmount;
      } else if (activeTab === "TRANSFER") {
        newSourceBalance -= numericAmount;

        // Hedef hesabı güncelle
        const targetAccount = accounts.find((a) => a.id === toAccountId);
        if (targetAccount) {
          const newTargetBalance = Number(targetAccount.balance) + numericAmount;
          await supabase
            .from("accounts")
            .update({ balance: newTargetBalance })
            .eq("id", toAccountId);
        }
      }

      // Kaynak hesabı güncelle
      await supabase
        .from("accounts")
        .update({ balance: newSourceBalance })
        .eq("id", accountId);

      // Formu sıfırla ve kapat
      setAmount("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("İşlem eklenirken hata:", err);
      alert("İşlem kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

            {/* Virman için Hedef Hesap */}
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
              /* Kategori Seçimi (Gelir / Gider için) */
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
                placeholder="Örn: Market alışverişi"
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