"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Trash2, Edit2, Phone, Wallet, X, FileText, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Transaction {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
}

interface Person {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  transactions?: Transaction[];
}

export default function PersonsPage() {
  const supabase = createClient();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Form State'leri
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    setLoading(true);
    try {
      // Kişileri ve ilişkili işlemleri çekiyoruz
      const { data, error } = await supabase
        .from("persons")
        .select(`
          *,
          transactions (
            type,
            amount
          )
        `)
        .order("name");

      if (error) throw error;
      if (data) setPersons(data);
    } catch (err) {
      console.error("Kişiler yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (person?: Person) => {
    if (person) {
      setEditingPerson(person);
      setName(person.name);
      setPhone(person.phone || "");
      setNotes(person.notes || "");
    } else {
      setEditingPerson(null);
      setName("");
      setPhone("");
      setNotes("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingPerson) {
        const { error } = await supabase
          .from("persons")
          .update({ name, phone: phone || null, notes: notes || null })
          .eq("id", editingPerson.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("persons")
          .insert([{ name, phone: phone || null, notes: notes || null }]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchPersons();
    } catch (err: any) {
      console.error("Kişi kaydedilirken hata:", err);
      alert("İşlem başarısız: " + (err.message || "Bilinmeyen hata"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kişiyi silmek istediğinize emin misiniz?")) return;

    try {
      const { error } = await supabase.from("persons").delete().eq("id", id);
      if (error) throw error;
      fetchPersons();
    } catch (err: any) {
      console.error("Kişi silinirken hata:", err);
      alert("Silinemedi: " + (err.message || "Bilinmeyen hata"));
    }
  };

  // Kişinin net bakiyesini hesaplayan yardımcı fonksiyon
  const calculateBalance = (transactions?: Transaction[]) => {
    if (!transactions) return 0;
    let balance = 0;
    transactions.forEach((tx) => {
      // Gider (EXPENSE) -> Kişiye para verildi (Alacak artar)
      // Gelir (INCOME) -> Kişiden para alındı / Ödeme yapıldı (Borç/Alacak kapanır)
      if (tx.type === "EXPENSE") {
        balance += Number(tx.amount);
      } else if (tx.type === "INCOME") {
        balance -= Number(tx.amount);
      }
    });
    return balance;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Kişiler</h1>
          <p className="text-sm text-slate-400">
            Borç, alacak ilişkisinde olduğunuz kişileri ve güncel bakiyelerini yönetin.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/35 transition-all hover:bg-indigo-500 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Yeni Kişi Ekle
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-slate-900/85 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : persons.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Henüz kayıtlı bir kişi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                  <th className="p-4">Ad Soyad</th>
                  <th className="p-4">Telefon</th>
                  <th className="p-4">Bakiye Durumu</th>
                  <th className="p-4">Notlar</th>
                  <th className="p-4 text-center">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {persons.map((person) => {
                  const balance = calculateBalance(person.transactions);
                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-bold text-xs">
                            {person.name.substring(0, 2).toUpperCase()}
                          </div>
                          {person.name}
                        </div>
                      </td>

                      <td className="p-4 text-slate-300">
                        {person.phone ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            {person.phone}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="p-4 font-medium">
                        {balance > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Alacaklısınız: {balance.toLocaleString("tr-TR")} ₺
                          </span>
                        ) : balance < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Borçlusunuz: {Math.abs(balance).toLocaleString("tr-TR")} ₺
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs font-normal">
                            Hesap Kapalı (0 ₺)
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-slate-400 max-w-xs truncate">
                        {person.notes || <span className="text-slate-600">-</span>}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(person)}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(person.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="Sil"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingPerson ? "Kişiyi Düzenle" : "Yeni Kişi Ekle"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Telefon (İsteğe bağlı)
                </label>
                <input
                  type="text"
                  placeholder="0532..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Notlar (İsteğe bağlı)
                </label>
                <textarea
                  rows={3}
                  placeholder="Kişi hakkında notlar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/35 transition-all cursor-pointer"
                >
                  {editingPerson ? "Değişiklikleri Kaydet" : "Kişiyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
