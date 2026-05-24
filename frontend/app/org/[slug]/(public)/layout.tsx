import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { TenantNavbar } from "@/components/tenant-navbar";
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
    <>
      <TenantNavbar slug={slug} orgName={org.name} />
      {children}
    </>
  );
}
