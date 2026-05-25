import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CourseAdminShell } from "@/components/layout/course-admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCourse, serverTenantPath } from "@/lib/tenant";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function CourseAdminLayout({ children, params }: Props) {
  const { slug, courseSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [course, backHref, coursePrefix] = await Promise.all([
    getTenantCourse(slug, courseSlug),
    serverTenantPath(slug, "/admin"),
    serverTenantPath(slug, `/admin/courses/${courseSlug}`),
  ]);

  if (!course) {
    redirect(await serverTenantPath(slug, "/admin"));
  }

  const navGroups = [
    {
      label: "Course editing",
      items: [
        { segment: "landing", label: "Course landing page", href: `${coursePrefix}/landing` },
        { segment: "curriculum", label: "Curriculum", href: `${coursePrefix}/curriculum` },
      ],
    },
    {
      label: "Course management",
      items: [
        { segment: "pricing", label: "Pricing", href: `${coursePrefix}/pricing` },
        { segment: "promotions", label: "Promotions", href: `${coursePrefix}/promotions` },
        { segment: "students", label: "Students", href: `${coursePrefix}/students` },
      ],
    },
  ];

  return (
    <CourseAdminShell
      courseSlug={courseSlug}
      courseTitle={course.title}
      backHref={backHref}
      navGroups={navGroups}
    >
      {children}
    </CourseAdminShell>
  );
}
