"use client";

import React, { useState } from "react";
import { importVakifBankCSV } from "@/servies/transactionService";

interface CsvImportButtonProps {
  accountId: string; // İşlemlerin hangi hesaba/karta ekleneceği
  onImportComplete?: () => void; // Başarılı aktarım sonrası tetiklenecek opsiyonel callback (örn: tabloyu yenilemek için)
}

export default function CsvImportButton({ accountId, onImportComplete }: CsvImportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("Dosya içeriği okunamadı.");
        }

        const result = await importVakifBankCSV(text, accountId);

        if (result.success) {
          alert(`Başarılı! ${result.count} adet işlem içeri aktarıldı.`);
          if (onImportComplete) {
            onImportComplete();
          }
        } else {
          alert(`Aktarım başarısız: ${result.error}`);
        }
      } catch (err: any) {
        alert("Bir hata oluştu: " + (err.message || err));
      } finally {
        setIsLoading(false);
        // Input değerini sıfırlıyoruz ki aynı dosya tekrar seçilebilsin
        e.target.value = "";
        setFileName(null);
      }
    };

    reader.onerror = () => {
      alert("Dosya okuma hatası.");
      setIsLoading(false);
      setFileName(null);
    };

    // VakıfBank ekstreleri Türkçe karakterler (UTF-8 yerine ISO-8859-9) içerdiği için bu encoding şarttır
    reader.readAsText(file, "ISO-8859-9");
  };

  return (
    <div className="inline-block w-full sm:w-auto">
      <label className={`cursor-pointer inline-flex w-full items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors sm:w-auto ${
        isLoading 
          ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
      }`}>
        {isLoading ? (
          <span>Aktarılıyor...</span>
        ) : (
          <span>VakıfBank CSV Yükle</span>
        )}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
        />
      </label>
      {fileName && isLoading && (
        <span className="ml-3 text-xs text-gray-500">{fileName} okunuyor...</span>
      )}
    </div>
  );
}
