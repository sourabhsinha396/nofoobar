import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HomepageEditor } from "@/components/admin/homepage/homepage-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  getAdminHomepageBlocks,
  getPublishedCourses,
  getTenantOrg,
  serverTenantPath,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminHomepagePage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [org, blocks, courses, adminHref] = await Promise.all([
    getTenantOrg(slug),
    getAdminHomepageBlocks(slug),
    getPublishedCourses(slug),
    serverTenantPath(slug, "/admin"),
  ]);

  if (!org) {
    notFound();
  }

  // 403 from the admin endpoint surfaces the same way as elsewhere in the
  // admin shell: signed in but not a member of this org.
  if (blocks === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <Card className="items-center p-10 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            You&apos;re not a member of {org.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask an owner to invite this account, or switch organizations.
          </p>
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
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Customize homepage
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Build your tenant&apos;s landing page from a stack of section blocks. Drag
          isn&apos;t supported yet — use the up/down arrows to reorder.
        </p>
      </header>

      <HomepageEditor
        orgSlug={slug}
        initialBlocks={blocks}
        courses={courses ?? []}
      />
    </main>
  );
}
