import { redirect } from "next/navigation";

import { CreateCourseForm } from "@/components/create-course-form";
import { getCurrentUser } from "@/lib/auth";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewCoursePage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
      <CreateCourseForm orgSlug={slug} />
    </main>
  );
}
