import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageForm } from "@/components/admin/pages/page-form";
import { DeletePageButton } from "@/components/admin/pages/delete-page-button";
import { getCurrentUser } from "@/lib/auth";
import { getAdminPage, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; pageSlug: string }>;
}

export default async function EditPagePage({ params }: Props) {
  const { slug, pageSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [page, pagesHref] = await Promise.all([
    getAdminPage(slug, pageSlug),
    serverTenantPath(slug, "/admin/pages"),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={pagesHref}
            className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Pages
          </Link>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {page.title}
          </h1>
        </div>
        <DeletePageButton orgSlug={slug} pageSlug={page.slug} />
      </header>
      <PageForm mode="edit" orgSlug={slug} initial={page} />
    </main>
  );
}
