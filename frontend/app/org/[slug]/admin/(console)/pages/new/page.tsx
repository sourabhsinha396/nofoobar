import Link from "next/link";
import { redirect } from "next/navigation";

import { PageForm } from "@/components/admin/pages/page-form";
import { getCurrentUser } from "@/lib/auth";
import { serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewPagePage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const pagesHref = await serverTenantPath(slug, "/admin/pages");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <Link
          href={pagesHref}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← Pages
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          New page
        </h1>
      </header>
      <PageForm mode="create" orgSlug={slug} />
    </main>
  );
}
