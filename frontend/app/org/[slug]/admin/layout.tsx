import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { AdminNavbar } from "@/components/layout/admin-navbar";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { slug } = await params;
  const org = await getTenantOrg(slug);
  if (!org) {
    notFound();
  }

  return (
    <>
      <AdminNavbar slug={slug} orgName={org.name} />
      {children}
    </>
  );
}
