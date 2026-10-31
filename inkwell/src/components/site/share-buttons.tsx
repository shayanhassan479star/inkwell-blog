"use client";

import { Check, Link2, Mail, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

type Props = { url: string; title: string };

export function ShareButtons({ url, title }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "Share on X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, text: "X" },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, text: "in" },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, text: "f" },
    { label: "Share on WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, text: "WA" },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copied to clipboard.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy automatically — select the address bar and copy manually.", "error");
    }
  }
  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const btn = "btn btn-outline h-9 min-w-9 px-3 text-xs font-semibold";
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Share this article">
      <span className="mr-1 text-sm font-medium text-muted-foreground">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} className={btn}>{l.text}</a>
      ))}
      <a href={`mailto:?subject=${t}&body=${u}`} aria-label="Share by email" className={btn}><Mail className="h-4 w-4" aria-hidden /></a>
      <button type="button" onClick={copy} className={btn} aria-label="Copy article link">
        {copied ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
      </button>
      {canShare && (
        <button type="button" onClick={nativeShare} className={btn} aria-label="Share via device"><Share2 className="h-4 w-4" aria-hidden /></button>
      )}
    </div>
  );
}
