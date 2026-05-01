import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTripaySignature } from "@/lib/tripay";

export async function POST(req: NextRequest) {
  try {
    const callbackSignature = req.headers.get("x-callback-signature") || "";
    const jsonPayload = await req.text();
    
    // 1. Verifikasi Signature dari Tripay
    if (!verifyTripaySignature(callbackSignature, jsonPayload)) {
      return Response.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }

    let data;
    try {
      data = JSON.parse(jsonPayload);
    } catch (parseErr) {
      console.error("[Tripay Webhook] JSON Parse Error");
      return Response.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
    }

    const { merchant_ref, reference, status, payment_method } = data;

    // Kita hanya memproses jika statusnya 'PAID'
    if (status !== "PAID") {
      return Response.json({ success: true, message: "Transaction not paid yet" });
    }

    // 2. Cari data permintaan pembelian di database
    // Jika data tidak ada (biasanya saat Tes Callback), kita jawab sukses agar Tripay tidak error 500
    const purchaseRequest = await prisma.agentTokenPurchaseRequest.findUnique({
      where: { id: merchant_ref },
      include: { agent: true }
    }).catch(() => null);

    if (!purchaseRequest) {
      console.log(`[Tripay Webhook] Transaksi ${merchant_ref} tidak ditemukan. (Mungkin Tes Callback?)`);
      return Response.json({ success: true, message: "Test Callback received" });
    }

    // Jika sudah pernah diproses (COMPLETED), jangan proses lagi
    if (purchaseRequest.status === "COMPLETED") {
      return Response.json({ success: true, message: "Already processed" });
    }

    // 3. AUTO-PROSES: Tambah saldo token agen & update status request
    await prisma.$transaction([
      // Update status permintaan menjadi COMPLETED
      prisma.agentTokenPurchaseRequest.update({
        where: { id: purchaseRequest.id },
        data: { 
          status: "COMPLETED",
          paymentRef: reference,
          paymentMethod: payment_method
        },
      }),
      // Tambah saldo agen
      prisma.agent.update({
        where: { id: purchaseRequest.agentId },
        data: {
          tokenBalance: { increment: purchaseRequest.tokenAmount },
          totalMinted: { increment: purchaseRequest.tokenAmount },
        },
      }),
      // Catat di Ledger Token
      prisma.tokenLedger.create({
        data: {
          agentId: purchaseRequest.agentId,
          type: "MINT",
          amount: purchaseRequest.tokenAmount,
          balanceBefore: purchaseRequest.agent.tokenBalance,
          balanceAfter: purchaseRequest.agent.tokenBalance + purchaseRequest.tokenAmount,
          description: `Pembelian Paket: ${purchaseRequest.packageName} via Tripay (${payment_method})`,
        },
      }),
    ]);

    console.log(`[Tripay Webhook] Berhasil memproses pembelian ${purchaseRequest.tokenAmount} token untuk agen ${purchaseRequest.agent.name}`);

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("[Tripay Webhook Error]:", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
