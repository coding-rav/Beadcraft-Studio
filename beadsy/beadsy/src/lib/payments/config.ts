/** Which payment providers have credentials configured. Never exposes the secrets themselves. */
export function configuredProviders(): { stripe: boolean; razorpay: boolean } {
  return {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };
}

/** Normalised result of verifying a provider callback; used by order state transitions. */
export type PaymentOutcome = "succeeded" | "failed" | "cancelled" | "pending" | "refunded";
