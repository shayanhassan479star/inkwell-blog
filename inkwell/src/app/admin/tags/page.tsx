import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { requireAdmin } from "@/lib/auth";
import { getTags } from "@/lib/posts";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireAdmin();
  const tags = await getTags();
  return (
    <>
      <PageHeader title="Tags" description="Fine-grained topics. Writers can also add new tags straight from the post editor." />
      <TaxonomyManager kind="tag" items={tags} />
    </>
  );
}
