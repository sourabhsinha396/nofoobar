// Loader + thin wrapper for the Razorpay JS Checkout SDK
// (https://checkout.razorpay.com/v1/checkout.js). Loaded on demand from
// the EnrollButton so we don't ship the script to free-only tenants.

interface RazorpayConstructorOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { email?: string; contact?: string; name?: string };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayConstructorOptions) => { open: () => void };
  }
}

export interface RazorpayOpenParams {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { email?: string };
  onSuccess: () => void;
  onDismiss?: () => void;
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay can only load in a browser context."));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay script.")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script."));
    document.head.appendChild(script);
  });
}

export async function openRazorpayCheckout(params: RazorpayOpenParams): Promise<void> {
  await loadRazorpayScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error("Razorpay SDK didn't load.");
  }
  const instance = new Razorpay({
    key: params.key,
    amount: params.amount,
    currency: params.currency,
    name: params.name,
    description: params.description,
    order_id: params.orderId,
    prefill: params.prefill,
    handler: () => params.onSuccess(),
    modal: params.onDismiss ? { ondismiss: params.onDismiss } : undefined,
  });
  instance.open();
}
