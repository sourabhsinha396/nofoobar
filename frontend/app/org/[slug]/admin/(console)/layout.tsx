import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell, type AdminNavGroup } from "@/components/layout/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { getTenantOrg, serverTenantPath } from "@/lib/tenant";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminConsoleLayout({ children, params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const org = await getTenantOrg(slug);
  if (!org) {
    notFound();
  }

  const [
    dashboardHref,
    homepageHref,
    pagesHref,
    navLinksHref,
    integrationsHref,
    paymentsHref,
    settingsHref,
    seoHref,
  ] = await Promise.all([
    serverTenantPath(slug, "/admin"),
    serverTenantPath(slug, "/admin/homepage"),
    serverTenantPath(slug, "/admin/pages"),
    serverTenantPath(slug, "/admin/nav-links"),
    serverTenantPath(slug, "/admin/integrations"),
    serverTenantPath(slug, "/admin/payments"),
    serverTenantPath(slug, "/admin/settings"),
    serverTenantPath(slug, "/admin/seo"),
  ]);

  const navGroups: AdminNavGroup[] = [
    {
      items: [{ segment: "", label: "Dashboard", href: dashboardHref }],
    },
    {
      label: "Content",
      items: [
        { segment: "homepage", label: "Homepage", href: homepageHref },
        { segment: "pages", label: "Pages", href: pagesHref },
        { segment: "nav-links", label: "Navigation", href: navLinksHref },
      ],
    },
    {
      label: "Setup",
      items: [
        { segment: "integrations", label: "Integrations", href: integrationsHref },
        { segment: "payments", label: "Payments", href: paymentsHref },
        { segment: "settings", label: "Settings", href: settingsHref },
        { segment: "seo", label: "SEO", href: seoHref },
      ],
    },
  ];

  return (
    <AdminShell orgName={org.name} navGroups={navGroups}>
      {children}
    </AdminShell>
  );
}
