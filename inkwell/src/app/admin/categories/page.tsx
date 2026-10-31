import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/posts";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await getCategories();
  return (
    <>
      <PageHeader title="Categories" description="Sections readers can browse. A post can belong to several; the first one is its primary category." />
      <TaxonomyManager kind="category" items={categories} />
    </>
  );
}
