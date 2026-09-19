import { createClient } from "@/lib/supabase/client";

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * VakıfBank CSV içeriğini parse edip Supabase'e toplu olarak kaydeder.
 */
export async function importVakifBankCSV(csvText: string, accountId: string): Promise<ImportResult> {
  try {
    const supabase = createClient();
    const lines = csvText.split("\n");
    
    const transactionsToInsert = [];

    // İlk 8 satır banka bilgi/başlık satırları olduğu için atlanıyor
    for (let i = 8; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(";");
      if (cols.length < 4) continue;

      const tarihStr = cols[1]?.trim(); // Örn: "25.08.2026"
      const aciklama = cols[2]?.trim();
      const tutarStr = cols[3]?.trim().replace(".", "").replace(",", "."); // Örn: "34952,74" -> "34952.74"

      let tutar = parseFloat(tutarStr);
      if (isNaN(tutar) || tutar <= 0) continue;

      // Tarih formatını ISO'ya çevirelim (DD.MM.YYYY -> YYYY-MM-DD)
      let formattedDate = new Date().toISOString().split("T")[0];
      if (tarihStr && tarihStr.includes(".")) {
        const parts = tarihStr.split(".");
        if (parts.length === 3) {
          const [day, month, year] = parts;
          if (day && month && year) {
            formattedDate = `${year}-${month}-${day}`;
          }
        }
      }

      // Kredi kartı ekstrelerinde negatif tutarlar genelde ödeme veya iadedir (INCOME)
      let type = "EXPENSE";
      if (tutar < 0) {
        type = "INCOME";
        tutar = Math.abs(tutar);
      }

      transactionsToInsert.push({
        type: type,
        amount: tutar,
        description: aciklama || "VakıfBank İşlemi",
        date: formattedDate,
        account_id: accountId,
        category_id: null,
      });
    }

    if (transactionsToInsert.length === 0) {
      return { success: false, count: 0, error: "Aktarılacak geçerli işlem bulunamadı." };
    }

    // Supabase'e toplu insert
    const { error } = await supabase.from("transactions").insert(transactionsToInsert);

    if (error) {
      console.error("Toplu aktarım hatası:", error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: transactionsToInsert.length };
  } catch (err: any) {
    console.error("CSV işleme sırasında beklenmeyen hata:", err);
    return { success: false, count: 0, error: err.message || "Bilinmeyen bir hata oluştu." };
  }
}

/**
 * Birden fazla işlemi toplu olarak günceller (örn: Toplu kategori atama)
 */
export async function bulkUpdateTransactions(
  ids: string[],
  updates: { category_id?: string; type?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: "Güncellenecek işlem seçilmedi." };
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("transactions")
      .update(updates)
      .in("id", ids); // Supabase in() filtresi ile birden fazla ID'yi aynı anda günceller

    if (error) {
      console.error("Toplu güncelleme hatası:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Toplu güncelleme sırasında beklenmeyen hata:", err);
    return { success: false, error: err.message || "Bilinmeyen bir hata oluştu." };
  }
}