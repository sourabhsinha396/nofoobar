import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NavLinksEditor } from "@/components/admin/nav-links/nav-links-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getAdminNavLinks, getTenantOrg } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminNavLinksPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [org, headerLinks, footerLinks] = await Promise.all([
    getTenantOrg(slug),
    getAdminNavLinks(slug, "header"),
    getAdminNavLinks(slug, "footer"),
  ]);

  if (!org) {
    notFound();
  }

  // 403 (non-member) surfaces as null from either fetch.
  if (headerLinks === null || footerLinks === null) {
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
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Navigation links
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Owner-only. Header links appear next to &ldquo;Courses&rdquo; in the top
          navbar. Footer links appear in the site footer.
        </p>
      </header>

      <div className="space-y-10">
        <NavLinksEditor
          orgSlug={slug}
          location="header"
          title="Header"
          description="Top navbar links. Keep this short; 2–4 items reads best."
          initialLinks={headerLinks}
        />
        <NavLinksEditor
          orgSlug={slug}
          location="footer"
          title="Footer"
          description="Footer links. Use for legal, social, or auxiliary destinations."
          initialLinks={footerLinks}
        />
      </div>
    </main>
  );
}
