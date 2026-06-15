import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HomepageBlocks } from "@/components/homepage/homepage-blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { tenantOrigin } from "@/lib/site-url";
import {
  getHomepageBlocks,
  getPublishedCourses,
  getTenantOrg,
  serverTenantPath,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

// Only a self-canonical here. Title + description come from the tenant public
// layout (title.absolute = org name) - declaring a title would re-apply the
// template and render "<org> | <org>". metadataBase is the tenant origin, so
// this relative canonical resolves to the preferred (custom-domain) host.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function TenantHome({ params }: Props) {
  const { slug } = await params;

  const [org, blocks, courses, coursesHref] = await Promise.all([
    getTenantOrg(slug),
    getHomepageBlocks(slug),
    getPublishedCourses(slug),
    serverTenantPath(slug, "/courses"),
  ]);

  if (!org) {
    notFound();
  }

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: tenantOrigin(org.slug, org.custom_domain),
    ...(org.description ? { description: org.description } : {}),
    ...(org.logo_url ? { logo: org.logo_url } : {}),
    ...(org.social_links.length
      ? { sameAs: org.social_links.map((link) => link.url) }
      : {}),
  };

  // Synthetic default for tenants that haven't customised yet: a hero with
  // the org's own metadata + a CTA into the catalog. Keeps day-one homepages
  // from rendering blank without requiring a migration backfill.
  if (!blocks || blocks.length === 0) {
    return (
      <main>
        <JsonLd data={organizationLd} />
        <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center md:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Welcome to
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-6xl">
            <AuroraText>{org.name}</AuroraText>
          </h1>
          {org.description && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {org.description}
            </p>
          )}
          <div className="mt-10 flex justify-center">
            <Link href={coursesHref}>
              <ShimmerButton className="text-base font-medium">
                Browse courses
              </ShimmerButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <JsonLd data={organizationLd} />
      <HomepageBlocks
        blocks={blocks}
        courses={courses ?? []}
        coursesPrefix={coursesHref}
      />
    </main>
  );
}
