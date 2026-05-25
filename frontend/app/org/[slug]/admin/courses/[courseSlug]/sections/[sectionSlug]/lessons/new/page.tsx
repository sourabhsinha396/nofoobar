import { redirect } from "next/navigation";

import { LessonForm } from "@/components/lesson/lesson-form";
import { getCurrentUser } from "@/lib/auth";
import { getTenantSection, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string; sectionSlug: string }>;
}

export default async function NewLessonPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const section = await getTenantSection(slug, courseSlug, sectionSlug);
  if (!section) {
    redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}`));
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
      <LessonForm
        mode="create"
        orgSlug={slug}
        courseSlug={courseSlug}
        sectionSlug={sectionSlug}
        sectionTitle={section.title}
      />
    </main>
  );
}
