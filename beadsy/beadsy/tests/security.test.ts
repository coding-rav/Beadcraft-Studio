import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { hmacSha256Hex, safeEqualHex, verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { signSession, verifySession } from "@/lib/session";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(48);
});

describe("razorpay signatures", () => {
  const secret = "rzp_secret";
  it("verifies a correct checkout signature and rejects a wrong one", () => {
    const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyRazorpayPaymentSignature("order_1", "pay_1", sig, secret)).toBe(true);
    expect(verifyRazorpayPaymentSignature("order_1", "pay_2", sig, secret)).toBe(false);
    expect(verifyRazorpayPaymentSignature("order_1", "pay_1", "bad", secret)).toBe(false);
    expect(verifyRazorpayPaymentSignature("order_1", "pay_1", sig, "")).toBe(false);
  });
  it("verifies webhook signatures over the raw body", () => {
    const body = '{"event":"payment.captured"}';
    const sig = hmacSha256Hex("whsec", body);
    expect(verifyRazorpayWebhookSignature(body, sig, "whsec")).toBe(true);
    expect(verifyRazorpayWebhookSignature(body + " ", sig, "whsec")).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, null, "whsec")).toBe(false);
  });
  it("compares hex safely when lengths differ", () => expect(safeEqualHex("ab", "abc")).toBe(false));
});

describe("session tokens", () => {
  const payload = { sub: "u1", role: "ADMIN" as const, name: "A", email: "a@b.co", pv: "abc" };
  it("round-trips", async () => {
    const t = await signSession(payload);
    expect(await verifySession(t)).toEqual(payload);
  });
  it("rejects tampered and empty tokens", async () => {
    const t = await signSession(payload);
    expect(await verifySession(t.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySession("")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
