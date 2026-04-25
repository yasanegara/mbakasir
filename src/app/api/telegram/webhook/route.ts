import { NextRequest } from "next/server";
import { sendTelegramNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("--- TELEGRAM WEBHOOK RECEIVED ---");
    console.log(JSON.stringify(body, null, 2));
    
    // Telegram mengirim data pesan dalam properti 'message'
    const message = body.message;

    if (message && message.text === "/start") {
      const chatId = message.chat.id;
      const firstName = message.from?.first_name || "Agen";

      const replyText = 
        `Halo <b>${firstName}</b>, selamat datang di Bot Notifikasi MbaKasir! 🎓\n\n` +
        `ID Telegram Anda adalah: <code>${chatId}</code>\n\n` +
        `Silakan salin ID di atas dan masukkan ke menu <b>Pengaturan Agen</b> di dashboard MbaKasir Anda untuk mulai menerima notifikasi pendaftaran toko baru secara otomatis.`;

      // Kirim balasan ke user
      await sendTelegramNotification(chatId.toString(), replyText);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    // Kita tetap kirim 200 agar Telegram tidak mencoba kirim ulang terus menerus jika ada error logic
    return Response.json({ ok: true });
  }
}
