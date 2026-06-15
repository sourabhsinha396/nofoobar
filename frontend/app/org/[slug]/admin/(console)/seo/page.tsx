import { notFound, redirect } from "next/navigation";

import { SeoEditor } from "@/components/admin/seo/seo-editor";
import { getCurrentUser } from "@/lib/auth";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminSeoPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const org = await getTenantOrg(slug);
  if (!org) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          SEO
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Owner-only. Customize how your site looks in search results and when
          shared on social media.
        </p>
      </header>

      <SeoEditor orgSlug={slug} initial={org} />
    </main>
  );
}
