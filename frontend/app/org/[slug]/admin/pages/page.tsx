import { Eye, EyeOff, Footprints } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  getAdminPages,
  getTenantOrg,
  serverTenantPath,
  type PageKind,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

const KIND_LABELS: Record<PageKind, string> = {
  terms: "Terms",
  privacy: "Privacy",
  refund: "Refund",
  contact: "Contact",
  custom: "Custom",
};

export default async function AdminPagesIndex({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [org, pages, adminHref, newHref, pagesPrefix] = await Promise.all([
    getTenantOrg(slug),
    getAdminPages(slug),
    serverTenantPath(slug, "/admin"),
    serverTenantPath(slug, "/admin/pages/new"),
    serverTenantPath(slug, "/admin/pages"),
  ]);

  if (!org) {
    notFound();
  }

  if (pages === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <Card className="items-center p-10 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            You&apos;re not a member of {org.name}
          </h1>
          <Button asChild className="mt-6" size="lg">
            <Link href="/me">Back to your organizations</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <Link
          href={adminHref}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← Admin
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Pages
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Static pages for legal docs (terms, privacy, refund) and anything
              else your tenant needs..
            </p>
          </div>
          <Button asChild>
            <Link href={newHref}>New page</Link>
          </Button>
        </div>
      </header>

      {pages.length === 0 ? (
        <Card className="items-center p-10 text-center">
          <p className="text-muted-foreground">No pages yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with a privacy policy and terms, since payment providers need them.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <Link href={`${pagesPrefix}/${page.slug}/edit`} className="block">
                <Card className="flex flex-row items-center gap-3 p-4 transition-colors hover:border-foreground/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{page.title}</p>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {KIND_LABELS[page.kind]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {page.is_published ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Eye className="size-3.5" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <EyeOff className="size-3.5" /> Draft
                      </span>
                    )}
                    {page.show_in_footer && (
                      <span className="inline-flex items-center gap-1">
                        <Footprints className="size-3.5" /> Footer
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
