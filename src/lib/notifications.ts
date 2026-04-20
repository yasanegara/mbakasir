/**
 * MbaKasir Notification Gateway
 * Terhubung dengan provider WhatsApp (misal: Fonnte/Watzap) dan Email (Resend/Nodemailer).
 */

export async function sendActivationNotification(data: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string | null;
  agentName: string;
  durationMonths: number;
  newPremiumUntil: Date;
}) {
  const formattedDate = data.newPremiumUntil.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = `Halo ${data.tenantName}!

🎉 Selamat, toko Anda telah berhasil diaktivasi ulang oleh Agen ${data.agentName}. 
Lisensi bisnis Anda diperpanjang selama ${data.durationMonths} bulan.

📅 Masa aktif lisensi baru Anda berlaku hingga:
*${formattedDate}*

Terima kasih telah bergabung dalam ekosistem MbaKasir Intelligence Pro. Jika ada kendala, segera hubungi Agen perwakilan Anda atau balasi pesan ini untuk layanan Pusat (SuperAdmin).

Salam hangat,
Manajemen Pusat MbaKasir`;

  // 1. Logika Pengiriman WhatsApp
  if (data.tenantPhone) {
    console.log(`\n[GATEWAY WA] Mengirim pesan ke ${data.tenantPhone}...`);
    
    if (process.env.FONNTE_TOKEN) {
      try {
        const formData = new FormData();
        formData.append("target", data.tenantPhone);
        formData.append("message", message);
        formData.append("delay", "2"); // 2 seconds delay to avoid ban

        const res = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            "Authorization": process.env.FONNTE_TOKEN,
          },
          body: formData,
        });
        const resData = await res.json();
        console.log("[GATEWAY WA] Response:", resData);
      } catch (err) {
        console.error("[GATEWAY WA] Gagal menghubungi server WA:", err);
      }
    } else {
      console.log("[GATEWAY WA] (Simulasi) Pesan yang akan dikirim:\n", message);
      console.log("[GATEWAY WA] Perhatian: FONNTE_TOKEN belum di-set di .env");
    }
  } else {
    console.warn(`[GATEWAY WA] Toko ${data.tenantName} tidak memiliki nomor telepon.`);
  }

  // 2. Logika Pengiriman Email
  if (data.tenantEmail) {
    console.log(`\n[GATEWAY EMAIL] Mengirim email ke ${data.tenantEmail}...`);
    console.log(`Subject: Lisensi MbaKasir Toko Anda Telah Aktif!`);
    // TODO: Implementasi Resend / SMTP Nodemailer
    // await resend.emails.send({ ... })
  }
}
