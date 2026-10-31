"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ConfirmOptions = { title: string; description?: string; confirmLabel?: string; destructive?: boolean };
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);
/** `const confirm = useConfirm(); if (await confirm({ title: "Delete?", destructive: true })) …` */
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (options && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [options]);

  const close = (result: boolean) => {
    dialogRef.current?.close();
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) close(false); // click on backdrop
        }}
        aria-labelledby="confirm-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      >
        {options && (
          <div className="p-6">
            <h2 id="confirm-title" className="text-xl font-semibold">{options.title}</h2>
            {options.description && <p className="mt-2 text-sm text-muted-foreground">{options.description}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => close(false)} autoFocus>
                Cancel
              </button>
              <button type="button" className={cn("btn", options.destructive ? "btn-danger" : "btn-primary")} onClick={() => close(true)}>
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
