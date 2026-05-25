import { redirect } from "next/navigation";

import { CourseForm } from "@/components/course-form";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCourse, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function EditCoursePage({ params }: Props) {
  const { slug, courseSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const course = await getTenantCourse(slug, courseSlug);
  if (!course) {
    redirect(await serverTenantPath(slug, "/admin"));
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
      <CourseForm
        mode="edit"
        orgSlug={slug}
        courseSlug={courseSlug}
        initial={{
          slug: course.slug,
          title: course.title,
          description: course.description,
          price_cents: course.price_cents,
          currency: course.currency,
        }}
      />
    </main>
  );
}
