import { redirect } from "next/navigation";

import { LessonForm } from "@/components/lesson-form";
import { getCurrentUser } from "@/lib/auth";
import { getTenantLesson, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{
    slug: string;
    courseSlug: string;
    sectionSlug: string;
    lessonSlug: string;
  }>;
}

export default async function EditLessonPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug, lessonSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const lesson = await getTenantLesson(slug, courseSlug, sectionSlug, lessonSlug);
  if (!lesson) {
    redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}`));
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
      <LessonForm
        mode="edit"
        orgSlug={slug}
        courseSlug={courseSlug}
        sectionSlug={sectionSlug}
        lessonSlug={lessonSlug}
        initial={{
          slug: lesson.slug,
          title: lesson.title,
          content_type: lesson.content_type,
          content: lesson.content,
        }}
      />
    </main>
  );
}
