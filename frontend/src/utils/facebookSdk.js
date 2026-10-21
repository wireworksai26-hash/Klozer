// Loads Meta's JavaScript SDK once, only on the screens that need it (connecting a WhatsApp number).

let loading = null;

/**
 * @param {{ appId: string, graphVersion: string }} options
 * @returns {Promise<object>} the FB object, ready to call FB.login
 */
export function loadFacebookSdk({ appId, graphVersion }) {
  if (typeof window === "undefined") return Promise.reject(new Error("Hanya di browser."));
  if (window.FB) return Promise.resolve(window.FB);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      resolve(window.FB);
    };
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => {
      loading = null;
      reject(new Error("Tidak dapat memuat Meta. Periksa koneksi atau pemblokir iklan Anda."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Open Meta's Embedded Signup window and resolve with what it returns: a one-time code, and the ids of the WhatsApp
 * Business Account and the number the client gave (sent by Meta as a message from facebook.com, not in the login answer).
 * Resolves { cancelled: true } when the window is closed before it finishes.
 */
export async function runEmbeddedSignup({ appId, configId, graphVersion }, { timeoutMs = 15000 } = {}) {
  const FB = await loadFacebookSdk({ appId, graphVersion });

  let session = null; // { wabaId, phoneNumberId } from the window's message
  let cancelled = false;
  const onMessage = (event) => {
    if (!/(^|\.)facebook\.com$/.test(new URL(event.origin).hostname)) return;
    let payload = event.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return;
      }
    }
    if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
    if (payload.event === "CANCEL") cancelled = true;
    if (payload.event === "FINISH" || payload.event === "FINISH_ONLY_WABA") {
      session = { wabaId: String(payload.data?.waba_id ?? ""), phoneNumberId: String(payload.data?.phone_number_id ?? "") };
    }
  };
  window.addEventListener("message", onMessage);

  try {
    const response = await new Promise((resolve) => {
      FB.login(resolve, {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      });
    });
    const code = response?.authResponse?.code;
    if (!code || cancelled) return { cancelled: true };

    // the window's message and the login answer arrive in either order: wait a little for the ids
    const deadline = Date.now() + timeoutMs;
    while (!session && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    if (!session?.phoneNumberId || !session?.wabaId) return { cancelled: false, incomplete: true };
    return { code, ...session };
  } finally {
    window.removeEventListener("message", onMessage);
  }
}
