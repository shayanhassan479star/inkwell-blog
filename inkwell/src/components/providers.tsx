"use client";

import { ThemeProvider } from "next-themes";
import { ConfirmProvider } from "./ui/confirm";
import { ToastProvider } from "./ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
