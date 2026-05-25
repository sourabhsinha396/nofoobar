import { redirect } from "next/navigation";

import { SectionForm } from "@/components/section/section-form";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCourse, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function NewSectionPage({ params }: Props) {
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
      <SectionForm mode="create" orgSlug={slug} courseSlug={courseSlug} courseTitle={course.title} />
    </main>
  );
}
