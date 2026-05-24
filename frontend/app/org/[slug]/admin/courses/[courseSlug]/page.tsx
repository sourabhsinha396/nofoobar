import { redirect } from "next/navigation";

import { serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function CourseDefaultPage({ params }: Props) {
  const { slug, courseSlug } = await params;
  redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}/curriculum`));
}
