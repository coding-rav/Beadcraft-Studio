/** Small bits of checkout choices kept in sessionStorage between /cart and /checkout. */
const KEY = "beadsy.checkout.v1";

export interface CheckoutPrefs {
  couponCode?: string;
  delivery?: "STANDARD" | "EXPRESS";
}

export function readCheckoutPrefs(): CheckoutPrefs {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as CheckoutPrefs;
  } catch {
    return {};
  }
}

export function writeCheckoutPrefs(p: CheckoutPrefs) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function clearCheckoutPrefs() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
