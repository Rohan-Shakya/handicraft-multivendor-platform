import * as React from "react";

export type ToastVariant = "default" | "destructive";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

type ToastListener = (toasts: Toast[]) => void;

// Module-level state so toast() can be called outside React components
let toasts: Toast[] = [];
const listeners: Set<ToastListener> = new Set();

function dispatch(action: ToastAction) {
  switch (action.type) {
    case "ADD_TOAST":
      toasts = [...toasts, action.toast];
      break;
    case "REMOVE_TOAST":
      toasts = toasts.filter((t) => t.id !== action.id);
      break;
  }
  listeners.forEach((listener) => listener(toasts));
}

let toastCount = 0;

export function toast(opts: Omit<Toast, "id">) {
  const id = String(++toastCount);
  dispatch({ type: "ADD_TOAST", toast: { ...opts, id } });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, 5000);

  return id;
}

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(toasts);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  function dismiss(id: string) {
    dispatch({ type: "REMOVE_TOAST", id });
  }

  return { toasts: state, toast, dismiss };
}
