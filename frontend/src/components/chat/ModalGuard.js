"use client";
import { createContext, useContext, useEffect } from "react";

/**
 * A dialog opened from inside the customer drawer must close on its own Escape, not take the drawer with it.
 * The page provides `{ enter, leave }`; a dialog calls `useModalGuard()` while it is mounted.
 */
export const ModalGuardContext = createContext(null);

export function useModalGuard() {
  const guard = useContext(ModalGuardContext);
  useEffect(() => {
    guard?.enter();
    return () => guard?.leave();
  }, [guard]);
}
