'use client';

import { useState } from 'react';
import { X, Building2, CreditCard, Wallet, Landmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Form State'leri
  const [name, setName] = useState('');
  const [type, setType] = useState<'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT'>('BANK');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [creditLimit, setCreditLimit] = useState('');
  const [cutoffDay, setCutoffDay] = useState('');

  if (!isOpen) return null;

  const TEMP_USER_ID = '21091783-46f7-4f95-8224-756e39aecae8';

  const handleSubmit = async (e: React.SubmitEvent) => {
  e.preventDefault();
  if (!name) return;

  setLoading(true);

  const accountData: any = {
    name,
    type,
    balance: balance ? Number.parseFloat(balance) : 0,
    currency,
    user_id: TEMP_USER_ID, // Sabit kullanıcı ID'si gönderiyoruz
  };

  if (type === 'CREDIT_CARD') {
    if (creditLimit) accountData.credit_limit = Number.parseFloat(creditLimit);
    if (cutoffDay) accountData.cutoff_day = Number.parseInt(cutoffDay);
  }

  const { error } = await supabase.from('accounts').insert([accountData]);

  setLoading(false);

  if (error) {
    console.error('Hesap eklenirken hata:', error.message);
    alert('Hesap eklenirken bir hata oluştu: ' + error.message);
  } else {
    setName('');
    setBalance('');
    setCreditLimit('');
    setCutoffDay('');
    if (onSuccess) onSuccess();
    onClose();
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-bold text-white">Yeni Hesap / Kart Ekle</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          
          {/* HESAP ADI */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hesap / Kart Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: Garanti Vadesiz, Akbank Axess"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* HESAP TİPİ */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hesap Türü</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="BANK">Banka Hesabı (Vadesiz)</option>
              <option value="CREDIT_CARD">Kredi Kartı</option>
              <option value="CASH">Nakit / Cüzdan</option>
              <option value="INVESTMENT">Yatırım / Birikim</option>
            </select>
          </div>

          {/* BAŞLANGIÇ BAKİYESİ VE PARA BİRİMİ */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {type === 'CREDIT_CARD' ? 'Mevcut Borç (Gerekirse)' : 'Başlangıç Bakiyesi'}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Birim</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GOLD">GR Altın</option>
              </select>
            </div>
          </div>

          {/* KREDİ KARTI ÖZEL ALANLARI */}
          {type === 'CREDIT_CARD' && (
            <div className="grid gap-3 border-t border-slate-800/60 pt-1 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kart Limiti (₺)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Hesap Kesim Günü</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Örn: 15"
                  value={cutoffDay}
                  onChange={(e) => setCutoffDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {loading ? 'Ekleniyor...' : 'Hesabı Kaydet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
