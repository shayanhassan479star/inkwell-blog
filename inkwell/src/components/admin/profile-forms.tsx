"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { changePassword, updateProfile } from "@/lib/actions/users";
import { slugify } from "@/lib/slug";
import { ImageUploadField } from "./image-upload-field";

export function ProfileForm({ initial }: { initial: { displayName: string; slug: string; bio: string; avatarUrl: string; websiteUrl: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateProfile(v);
      if (res.ok) { toast(res.message ?? "Saved.", "success"); setErrors({}); router.refresh(); }
      else { setErrors(res.fieldErrors ?? {}); toast(res.error, "error"); }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="p-name" className="label">Display name</label>
        <input id="p-name" value={v.displayName} onChange={(e) => setV({ ...v, displayName: e.target.value })} maxLength={80} required className="input" aria-invalid={Boolean(errors.displayName)} />
        {errors.displayName && <p className="field-error" role="alert">{errors.displayName}</p>}
      </div>
      <div>
        <label htmlFor="p-slug" className="label">Profile URL</label>
        <input id="p-slug" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value.toLowerCase() })} onBlur={() => setV((s) => ({ ...s, slug: slugify(s.slug) }))} maxLength={80} required className="input font-mono text-[13px]" aria-invalid={Boolean(errors.slug)} />
        <p className="hint">Your public page lives at /author/{v.slug || "your-name"}</p>
        {errors.slug && <p className="field-error" role="alert">{errors.slug}</p>}
      </div>
      <div>
        <label htmlFor="p-bio" className="label">Bio</label>
        <textarea id="p-bio" rows={5} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} maxLength={1000} className="input" aria-invalid={Boolean(errors.bio)} />
        <p className="hint">Shown on your author page, the About page and the homepage introduction. {v.bio.length}/1000</p>
        {errors.bio && <p className="field-error" role="alert">{errors.bio}</p>}
      </div>
      <ImageUploadField label="Profile photo" rounded value={v.avatarUrl} onChange={(url) => setV({ ...v, avatarUrl: url })} error={errors.avatarUrl} />
      <div>
        <label htmlFor="p-web" className="label">Website</label>
        <input id="p-web" type="url" inputMode="url" value={v.websiteUrl} onChange={(e) => setV({ ...v, websiteUrl: e.target.value })} placeholder="https://" className="input" aria-invalid={Boolean(errors.websiteUrl)} />
        {errors.websiteUrl && <p className="field-error" role="alert">{errors.websiteUrl}</p>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending && <Spinner />}Save profile</button>
    </form>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (v.next !== v.confirm) {
      setErrors({ confirm: "The new passwords don't match." });
      return;
    }
    start(async () => {
      const res = await changePassword({ current: v.current, next: v.next });
      if (res.ok) { toast(res.message ?? "Password changed.", "success"); setV({ current: "", next: "", confirm: "" }); setErrors({}); }
      else { setErrors(res.fieldErrors ?? {}); toast(res.error, "error"); }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="pw-cur" className="label">Current password</label>
        <input id="pw-cur" type="password" autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} required className="input" aria-invalid={Boolean(errors.current)} />
        {errors.current && <p className="field-error" role="alert">{errors.current}</p>}
      </div>
      <div>
        <label htmlFor="pw-new" className="label">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} minLength={12} required className="input" aria-invalid={Boolean(errors.next)} />
        <p className="hint">At least 12 characters with upper-case, lower-case and a number.</p>
        {errors.next && <p className="field-error" role="alert">{errors.next}</p>}
      </div>
      <div>
        <label htmlFor="pw-conf" className="label">Confirm new password</label>
        <input id="pw-conf" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} required className="input" aria-invalid={Boolean(errors.confirm)} />
        {errors.confirm && <p className="field-error" role="alert">{errors.confirm}</p>}
      </div>
      <button type="submit" className="btn btn-outline" disabled={pending}>{pending && <Spinner />}Change password</button>
    </form>
  );
}
