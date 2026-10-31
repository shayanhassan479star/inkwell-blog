/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { cn } from "@/lib/utils";

function isSupabaseHost(src: string): boolean {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(base) && new URL(src).hostname === new URL(base as string).hostname;
  } catch {
    return false;
  }
}

function hueFrom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

type Props = {
  src: string | null;
  alt: string;
  seed: string;
  title?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * Responsive cover image in a fixed aspect-ratio box (no layout shift). Supabase-hosted images are
 * optimised by next/image; other https images are loaded lazily as-is. Posts without a cover get a
 * generated typographic placeholder so cards never look broken.
 */
export function CoverImage({ src, alt, seed, title, priority = false, sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw", className }: Props) {
  return (
    <div className={cn("relative aspect-[16/10] w-full overflow-hidden bg-muted", className)}>
      {src ? (
        isSupabaseHost(src) ? (
          <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        )
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex items-end p-5"
          style={{ background: `linear-gradient(135deg, hsl(${hueFrom(seed)} 45% 38%), hsl(${(hueFrom(seed) + 40) % 360} 55% 22%))` }}
        >
          <span className="line-clamp-3 font-display text-2xl font-semibold leading-tight text-white/90">{title ?? ""}</span>
        </div>
      )}
    </div>
  );
}
