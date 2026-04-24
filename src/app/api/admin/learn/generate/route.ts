import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBrandConfig } from "@/lib/brand-config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

function isMissingModelError(err: unknown) {
  return (
    err instanceof Error &&
    err.message.includes("404") &&
    err.message.includes("models/")
  );
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Unknown error";
}

async function generateWithGeminiFallback(apiKey: string, prompt: string, requestedModel?: string) {
  const genAI = new GoogleGenerativeAI(apiKey);

  if (requestedModel) {
    const model = genAI.getGenerativeModel({ model: requestedModel });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { content: response.text(), modelName: requestedModel };
  }

  let lastError: unknown;

  for (const modelName of GEMINI_TEXT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      return {
        content: response.text(),
        modelName,
      };
    } catch (err) {
      lastError = err;

      if (!isMissingModelError(err)) {
        throw err;
      }

      console.warn(`Gemini model not available for generateContent: ${modelName}`);
    }
  }

  throw lastError ?? new Error("Tidak ada model Gemini yang tersedia.");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, instruction, model: requestedModel, type = "article" } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  }

  const config = await getBrandConfig();
  if (!config.geminiApiKey) {
    return NextResponse.json({ error: "Gemini API Key belum dikonfigurasi di pengaturan brand" }, { status: 400 });
  }

  try {
    let prompt = "";
    
    if (type === "keywords") {
      prompt = `
        Tugas: Sebagai pakar SEO (Search Engine Optimization), carikan Keyword (Kata Kunci) terbaik untuk artikel berjudul: "${title}".
        
        Hasil yang dibutuhkan:
        1. High Paying Keywords (Kata kunci dengan nilai CPC/iklan tinggi yang relevan).
        2. Most Popular Keywords (Kata kunci dengan volume pencarian tinggi).
        3. Long-tail Keywords (Kata kunci spesifik untuk target UMKM).
        
        Aturan:
        - Berikan hasil dalam bentuk list poin yang padat.
        - Fokus pada market Indonesia dan UMKM/Bisnis.
        - Berikan maksimal 10-15 keywords.
        - Hasil jangan pakai penjelasan panjang, langsung list-nya saja.
      `;
    } else {
      prompt = `
Bertindaklah sebagai MbaKasir, asisten cerdas untuk UMKM. Gunakan kepribadian: Kakak perempuan yang hangat (ngayomi), sabar, dan sangat menguasai operasional toko.

${config.aiKnowledgeBase ? `MAKLUMAT WAJIB (Selalu patuhi aturan ini):
${config.aiKnowledgeBase}
` : ""}

TUGAS: Buatkan draf artikel panduan dalam format Markdown berdasarkan judul dan instruksi berikut.

JUDUL: ${title}
INSTRUKSI TAMBAHAN: ${instruction || "Buatkan panduan yang lengkap dan mudah dipahami anak SMP."}

ATURAN PENULISAN:
1. Gaya Bahasa: Bahasa Indonesia yang santai tapi sopan. Sapa pengguna dengan sebutan 'Bos' atau 'Mitra'.
2. Tampilan: Gunakan Markdown yang rapi. Pakai Heading (##) untuk setiap bab, dan berikan baris kosong (2x Enter) antar paragraf agar tidak menumpuk.
3. Emoji: Gunakan emoji yang relevan (🚀, 💰, 🏪, ✨) untuk memberi semangat.
4. Aksi: Sebutkan fitur MbaKasir jika relevan (📦 Produk, 🖥️ Kasir (POS), 📈 Laporan, 🛒 Daftar Belanja).
5. Struktur: Mulai dengan salam pembuka yang hangat, isi materi yang praktis, dan akhiri dengan semangat.

HASILKAN HANYA KONTEN MARKDOWN-NYA SAJA TANPA PENJELASAN LAIN.
      `;
    }

    const { content, modelName } = await generateWithGeminiFallback(
      config.geminiApiKey,
      prompt,
      requestedModel
    );

    return NextResponse.json({ content, model: modelName });
  } catch (err: unknown) {
    console.error("AI Generate Error:", err);
    const errorMessage = getErrorMessage(err);

    if (isMissingModelError(err)) {
      return NextResponse.json(
        {
          error:
            "Model Gemini untuk fitur ini sudah tidak tersedia di Google AI Studio. Sistem sudah mencoba beberapa model teks terbaru, tapi semuanya ditolak untuk API key ini.",
        },
        { status: 502 }
      );
    }

    // Jika masih 429, beri pesan yang lebih bersahabat
    if (errorMessage.includes("429")) {
      return NextResponse.json({ error: "Waduh, si Mba lagi capek nulis (Limit Quota). Coba lagi dalam 1 menit ya Bos!" }, { status: 429 });
    }

    return NextResponse.json({ error: "Gagal generate artikel: " + errorMessage }, { status: 500 });
  }
}
