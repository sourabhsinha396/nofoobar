import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { TenantFooter } from "@/components/layout/tenant-footer";
import { TenantNavbar } from "@/components/layout/tenant-navbar";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantPublicLayout({ children, params }: Props) {
  const { slug } = await params;
  const org = await getTenantOrg(slug);
  if (!org) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TenantNavbar slug={slug} orgName={org.name} logoUrl={org.logo_url} />
      <div className="flex-1">{children}</div>
      <TenantFooter slug={slug} org={org} />
    </div>
  );
}
