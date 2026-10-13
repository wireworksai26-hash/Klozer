"use client";
import { useEffect, useState } from "react";
import { hasCachedSession, validateSession } from "@/utils/api";

/**
 * Whether the public pages should show "Dashboard" instead of "Masuk".
 *
 * The cached profile paints the right button immediately, then /auth/me confirms it. If the server
 * session is gone the cached copy is removed and the button flips back, so an expired visitor is
 * never left looking signed in. A visitor with no cached profile triggers no request at all.
 */
export default function useSessionHint() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    const reconcile = async () => {
      if (!hasCachedSession()) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      const result = await validateSession();
      if (active && result.state === "expired") setSignedIn(false);
    };

    // Reading browser storage after mount (it does not exist during server rendering).
    reconcile();

    // Back/forward cache restores the page without re-running effects.
    const onPageShow = (event) => {
      if (event.persisted) reconcile();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      active = false;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return signedIn;
}
