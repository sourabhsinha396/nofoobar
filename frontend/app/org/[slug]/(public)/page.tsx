import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getTenantOrg, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getTenantOrg(slug);
  if (!org) {
    return {};
  }
  return {
    title: org.name,
    description: org.description ?? undefined,
  };
}

export default async function TenantHome({ params }: Props) {
  const { slug } = await params;

  const [org, coursesHref] = await Promise.all([
    getTenantOrg(slug),
    serverTenantPath(slug, "/courses"),
  ]);

  if (!org) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-24 md:py-32">
      <section className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Welcome to
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-6xl">
          {org.name}
        </h1>
        {org.description && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {org.description}
          </p>
        )}
        <div className="mt-10">
          <Button asChild size="lg">
            <Link href={coursesHref}>Browse courses</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
