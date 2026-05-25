import { redirect } from "next/navigation";

import { SectionForm } from "@/components/section/section-form";
import { getCurrentUser } from "@/lib/auth";
import { getTenantSection, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string; sectionSlug: string }>;
}

export default async function EditSectionPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const section = await getTenantSection(slug, courseSlug, sectionSlug);
  if (!section) {
    redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}/curriculum`));
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
      <SectionForm
        mode="edit"
        orgSlug={slug}
        courseSlug={courseSlug}
        sectionSlug={sectionSlug}
        initial={{
          slug: section.slug,
          title: section.title,
          description: section.description,
        }}
      />
    </main>
  );
}
