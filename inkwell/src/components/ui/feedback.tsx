import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

const STYLES = {
  error: { icon: AlertCircle, cls: "border-danger/40 bg-danger/10 text-danger" },
  success: { icon: CheckCircle2, cls: "border-success/40 bg-success/10 text-success" },
  info: { icon: Info, cls: "border-accent/40 bg-accent/10 text-foreground" },
} as const;

export function Alert({ kind = "info", title, children, className }: { kind?: keyof typeof STYLES; title?: string; children?: React.ReactNode; className?: string }) {
  const { icon: Icon, cls } = STYLES[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1 text-foreground">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/90">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-display text-xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}
