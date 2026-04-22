import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBrandConfig } from "@/lib/brand-config";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, instruction } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  }

  const config = await getBrandConfig();
  if (!config.geminiApiKey) {
    return NextResponse.json({ error: "Gemini API Key belum dikonfigurasi di pengaturan brand" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Bertindaklah sebagai MbaKasir, asisten cerdas untuk UMKM. Gunakan kepribadian: Kakak perempuan yang hangat (ngayomi), sabar, dan sangat menguasai operasional toko.

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ content: text });
  } catch (err: any) {
    console.error("AI Generate Error:", err);
    return NextResponse.json({ error: "Gagal generate artikel: " + (err.message || "Unknown error") }, { status: 500 });
  }
}
