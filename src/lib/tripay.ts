import crypto from "crypto";

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY || "";
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY || "";
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE || "";
const TRIPAY_MODE = process.env.TRIPAY_MODE || "sandbox"; // sandbox or production

const BASE_URL = TRIPAY_MODE === "production" 
  ? "https://tripay.co.id/api/transaction/create" 
  : "https://tripay.co.id/api-sandbox/transaction/create";

export async function createTripayTransaction(params: {
  method: string;
  merchantRef: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderItems: { name: string; price: number; quantity: number }[];
}) {
  const { method, merchantRef, amount, customerName, customerEmail, customerPhone, orderItems } = params;

  // Signature Tripay
  const signature = crypto
    .createHmac("sha256", TRIPAY_PRIVATE_KEY)
    .update(TRIPAY_MERCHANT_CODE + merchantRef + amount)
    .digest("hex");

  const payload = {
    method,
    merchant_ref: merchantRef,
    amount,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    order_items: orderItems,
    signature,
  };

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TRIPAY_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("Tripay API Error:", data);
    throw new Error(data.message || "Gagal membuat transaksi di Tripay");
  }

  return data.data; // Mengembalikan data transaksi dari Tripay
}

export function verifyTripaySignature(callbackSignature: string, jsonPayload: string) {
  const signature = crypto
    .createHmac("sha256", TRIPAY_PRIVATE_KEY)
    .update(jsonPayload)
    .digest("hex");

  return signature === callbackSignature;
}
