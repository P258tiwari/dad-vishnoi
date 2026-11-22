import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Online video consultation fee. The amount is set here on the server and never taken from the browser.
export const CONSULTATION_FEE_PAISE = 150_000;

const RAZORPAY_API = "https://api.razorpay.com/v1";

function config() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  return { keyId, keySecret };
}

async function razorpayRequest<T>(path: string, body?: unknown) {
  const { keyId, keySecret } = config();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = await response.text().then((value) => value.slice(0, 300)).catch(() => "Unavailable");
    throw new Error(`Razorpay API returned ${response.status}: ${detail}`);
  }
  return response.json() as Promise<T>;
}

export async function createConsultationOrder(customer: { name: string; phone: string }) {
  const order = await razorpayRequest<{ id: string; amount: number; currency: string }>("/orders", {
    amount: CONSULTATION_FEE_PAISE,
    currency: "INR",
    receipt: `ping-${Date.now()}`,
    // Saved on the Razorpay order so the team can always identify who paid.
    notes: { name: customer.name.slice(0, 100), phone: customer.phone, purpose: "Online video consultation" },
  });
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: config().keyId };
}

export type VerifiedPayment = { paymentId: string; orderId: string; amountPaise: number };

/**
 * Confirms a Checkout payment with Razorpay itself: the signature proves the IDs came from Razorpay,
 * and the payment lookup proves the full fee was received for this order.
 */
export async function verifyConsultationPayment(input: { orderId: string; paymentId: string; signature: string }): Promise<VerifiedPayment | null> {
  const expected = Buffer.from(createHmac("sha256", config().keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex"));
  const supplied = Buffer.from(input.signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  type Payment = { id: string; order_id: string; amount: number; currency: string; status: string };
  let payment = await razorpayRequest<Payment>(`/payments/${encodeURIComponent(input.paymentId)}`);
  if (payment.order_id !== input.orderId || payment.amount !== CONSULTATION_FEE_PAISE || payment.currency !== "INR") return null;
  // Accounts without auto-capture leave payments "authorized"; capture so the money is actually received.
  if (payment.status === "authorized") {
    payment = await razorpayRequest<Payment>(`/payments/${encodeURIComponent(input.paymentId)}/capture`, { amount: CONSULTATION_FEE_PAISE, currency: "INR" });
  }
  if (payment.status !== "captured") return null;
  return { paymentId: payment.id, orderId: payment.order_id, amountPaise: payment.amount };
}
