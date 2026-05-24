"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { DeleteCourseButton } from "@/components/delete-course-button";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface NavItem {
  segment: string;
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface Props {
  course: { title: string; slug: string; description: string | null };
  orgSlug: string;
  editHref: string;
  sectionCount: number;
  backHref: string;
  navGroups: NavGroup[];
  children: ReactNode;
}

export function CourseAdminShell({
  course,
  orgSlug,
  editHref,
  sectionCount,
  backHref,
  navGroups,
  children,
}: Props) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname.endsWith(`/${course.slug}/${item.segment}`);
                    return (
                      <SidebarMenuItem key={item.segment}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>{item.label}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
          <header className="mb-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Link
                href={backHref}
                className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                ← Courses
              </Link>
            </div>
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Course
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              {course.title}
            </h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">{course.slug}</p>
            {course.description && (
              <p className="mt-4 max-w-2xl text-muted-foreground">{course.description}</p>
            )}
            <div className="mt-6 flex items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href={editHref}>Edit course</Link>
              </Button>
              <DeleteCourseButton
                orgSlug={orgSlug}
                courseSlug={course.slug}
                courseTitle={course.title}
                sectionCount={sectionCount}
              />
            </div>
          </header>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
