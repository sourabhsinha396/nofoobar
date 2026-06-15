"use client";

import {
  Blocks,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
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

export interface AdminNavItem {
  /** Path segment after `/admin` ("" for the dashboard root). Drives both the
   *  icon lookup and the active-state match, which tolerates subdomain
   *  (`/admin/...`) and apex path mode (`/org/<slug>/admin/...`). */
  segment: string;
  label: string;
  href: string;
}

export interface AdminNavGroup {
  label?: string;
  items: AdminNavItem[];
}

// Icons live here (client side) rather than as props - lucide components can't
// cross the server/client boundary as serialized props.
const SEGMENT_ICONS: Record<string, LucideIcon> = {
  "": LayoutDashboard,
  homepage: LayoutTemplate,
  pages: FileText,
  "nav-links": Link2,
  integrations: Blocks,
  payments: CreditCard,
  settings: Settings,
  seo: Search,
};

interface Props {
  orgName: string;
  navGroups: AdminNavGroup[];
  children: ReactNode;
}

function isItemActive(pathname: string, segment: string): boolean {
  if (segment === "") {
    // Dashboard: active only on the console root, not on `/admin/<section>`.
    return pathname.endsWith("/admin");
  }
  // Section (and its detail sub-routes) stay active, e.g. /admin/integrations/slack.
  return pathname.includes(`/admin/${segment}`);
}

export function AdminShell({ orgName, navGroups, children }: Props) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
              {orgName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={orgName}>
                {orgName}
              </p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group, index) => (
            <SidebarGroup key={group.label ?? index}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = SEGMENT_ICONS[item.segment] ?? LayoutDashboard;
                    return (
                      <SidebarMenuItem key={item.segment || "dashboard"}>
                        <SidebarMenuButton
                          asChild
                          size="lg"
                          isActive={isItemActive(pathname, item.segment)}
                          className="gap-3 text-[15px] [&>svg]:size-5"
                        >
                          <Link href={item.href}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
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
        {/* Mobile-only trigger row; the sidebar is offcanvas below md. Width and
            padding are owned by each page's own wrapper (mx-auto max-w-*). */}
        <div className="flex items-center gap-2 px-4 py-3 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium text-muted-foreground">Admin</span>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
