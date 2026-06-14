import { notFound, redirect } from "next/navigation";

import { SettingsEditor } from "@/components/admin/settings/settings-editor";
import { getCurrentUser } from "@/lib/auth";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminSettingsPage({ params }: Props) {
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
          Brand &amp; contact
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Owner-only. These fields drive your tenant&apos;s navbar, footer, and
          public-facing pages.
        </p>
      </header>

      <SettingsEditor orgSlug={slug} initial={org} />
    </main>
  );
}
