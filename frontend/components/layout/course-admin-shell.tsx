"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
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
  courseSlug: string;
  courseTitle: string;
  backHref: string;
  navGroups: NavGroup[];
  children: ReactNode;
}

export function CourseAdminShell({
  courseSlug,
  courseTitle,
  backHref,
  navGroups,
  children,
}: Props) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Course
            </p>
            <p className="mt-0.5 truncate text-sm font-medium" title={courseTitle}>
              {courseTitle}
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname.endsWith(`/${courseSlug}/${item.segment}`);
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
          <div className="mb-8 flex items-center gap-3">
            <SidebarTrigger />
            <Link
              href={backHref}
              className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              ← Courses
            </Link>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
