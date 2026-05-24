import { useEffect, useCallback, useRef } from "react";

export interface HotkeyDef {
  /** e.g. "mod+k", "mod+shift+p", "g then o" (sequence) */
  key: string;
  /** Human-readable label shown in the shortcuts panel */
  label: string;
  /** Category for grouping */
  category?: string;
  /** Handler */
  handler: () => void;
  /** If true, the shortcut works even when an input/textarea is focused */
  allowInInput?: boolean;
}

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

function parseKey(combo: string) {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());
  return {
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts.filter((p) => !["mod", "shift", "alt"].includes(p))[0] ?? "",
  };
}

function matchesCombo(e: KeyboardEvent, combo: ReturnType<typeof parseKey>): boolean {
  const mac = isMac();
  const modPressed = mac ? e.metaKey : e.ctrlKey;

  if (combo.mod && !modPressed) return false;
  if (!combo.mod && modPressed) return false;
  if (combo.shift && !e.shiftKey) return false;
  if (combo.alt && !e.altKey) return false;

  return e.key.toLowerCase() === combo.key;
}

/**
 * useHotkeys — registers global keyboard shortcuts.
 *
 * Supports:
 * - "mod+k" (Cmd on Mac, Ctrl on Windows/Linux)
 * - "mod+shift+p"
 * - Single keys like "?" (for help panel)
 * - "g then o" (two-key sequences — press g, then o within 1s)
 */
export function useHotkeys(hotkeys: HotkeyDef[]) {
  const pendingSequence = useRef<string | null>(null);
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        if (!hk.allowInInput && isInputElement(e.target)) continue;

        // Two-key sequence: "g then o"
        if (hk.key.includes(" then ")) {
          const [first, second] = hk.key.split(" then ").map((s) => s.trim().toLowerCase());

          if (pendingSequence.current === first) {
            if (e.key.toLowerCase() === second) {
              e.preventDefault();
              pendingSequence.current = null;
              if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
              hk.handler();
              return;
            }
          }

          if (e.key.toLowerCase() === first && !e.metaKey && !e.ctrlKey && !e.altKey) {
            pendingSequence.current = first;
            if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
            sequenceTimer.current = setTimeout(() => {
              pendingSequence.current = null;
            }, 1000);
            continue;
          }

          continue;
        }

        // Standard combo
        const combo = parseKey(hk.key);
        if (matchesCombo(e, combo)) {
          e.preventDefault();
          hk.handler();
          return;
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
    };
  }, [handler]);
}

/**
 * Returns a platform-aware symbol for modifier keys.
 */
export function modSymbol(): string {
  return isMac() ? "⌘" : "Ctrl";
}

export function formatShortcut(key: string): string {
  const mac = isMac();
  return key
    .replace(/mod/gi, mac ? "⌘" : "Ctrl")
    .replace(/shift/gi, mac ? "⇧" : "Shift")
    .replace(/alt/gi, mac ? "⌥" : "Alt")
    .replace(/\+/g, " ")
    .replace(/ then /g, " → ");
}
