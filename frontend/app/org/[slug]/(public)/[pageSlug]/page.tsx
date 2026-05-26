import type { Metadata } from "next";
import type { JSONContent } from "@tiptap/react";
import { notFound } from "next/navigation";

import { ArticleRenderer } from "@/components/lesson/article-renderer";
import { getPublishedPage } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; pageSlug: string }>;
}

// Catch-all for tenant-authored pages (terms, privacy, refund, contact,
// custom). Static segments under (public)/ — courses, login, signup,
// my-learning — win precedence in Next.js, so this only fires on slugs
// that aren't already routes. Reserved slugs are also blocked at write
// time by the backend schema so admins never even create a colliding row.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const page = await getPublishedPage(slug, pageSlug);
  if (!page) {
    return {};
  }
  return { title: page.title };
}

export default async function TenantPageRoute({ params }: Props) {
  const { slug, pageSlug } = await params;
  const page = await getPublishedPage(slug, pageSlug);
  if (!page) {
    notFound();
  }
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-20">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {page.title}
        </h1>
      </header>
      <ArticleRenderer doc={page.body as JSONContent} />
    </main>
  );
}
