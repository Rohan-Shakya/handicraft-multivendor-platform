import { useEffect, useState, useCallback } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastId = 0;
const listeners: Array<(toasts: ToastMessage[]) => void> = [];
let toasts: ToastMessage[] = [];

function dispatch(toast: Omit<ToastMessage, "id">) {
  const id = String(++toastId);
  toasts = [...toasts, { ...toast, id }];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toasts));
  }, 4000);
}

export function toast(message: Omit<ToastMessage, "id">) {
  dispatch(message);
}

export function useToasts() {
  const [state, setState] = useState<ToastMessage[]>(toasts);

  // useEffect (not useState) — useState's lazy init ignores returned cleanup
  // functions, so the prior version subscribed without ever unsubscribing,
  // leaking listeners and re-rendering unmounted components.
  useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toasts));
  }, []);

  return { toasts: state, dismiss };
}
