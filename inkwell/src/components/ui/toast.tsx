"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; kind: Kind; message: string };
type ToastFn = (message: string, kind?: Kind) => void;

const ToastContext = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastContext);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const COLORS = { success: "text-success", error: "text-danger", info: "text-accent" } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastFn>(
    (message, kind = "info") => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4500);
    },
    [dismiss],
  );
  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end">
        {items.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-in items-start gap-3 rounded-xl border border-border bg-card p-3 pr-2 text-sm shadow-lg">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", COLORS[t.kind])} aria-hidden />
              <p className="flex-1">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss notification">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
