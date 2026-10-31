/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (src) {
    return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span aria-hidden style={style} className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-display font-semibold text-accent", className)}>
      {initials}
    </span>
  );
}
