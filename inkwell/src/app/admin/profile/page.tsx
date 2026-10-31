import { PageHeader } from "@/components/admin/ui";
import { PasswordForm, ProfileForm } from "@/components/admin/profile-forms";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const { profile, user } = await requireStaff();
  return (
    <>
      <PageHeader title="My profile" description={`Signed in as ${user.email ?? "your account"}.`} />
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="prof-h">
          <h2 id="prof-h" className="mb-5 text-xl font-semibold">Public profile</h2>
          <ProfileForm initial={{ displayName: profile.display_name, slug: profile.slug, bio: profile.bio ?? "", avatarUrl: profile.avatar_url ?? "", websiteUrl: profile.website_url ?? "" }} />
        </section>
        <section className="card h-fit p-6" aria-labelledby="pw-h">
          <h2 id="pw-h" className="mb-5 text-xl font-semibold">Password</h2>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
