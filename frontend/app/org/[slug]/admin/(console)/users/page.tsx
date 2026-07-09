import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MembersTable } from "@/components/admin/users/members-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getOrgMembers, getTenantOrg } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminUsersPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [org, members] = await Promise.all([
    getTenantOrg(slug),
    getOrgMembers(slug),
  ]);

  if (!org) {
    notFound();
  }

  // 403 (student or non-member) surfaces as null from the roster fetch.
  if (members === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <Card className="items-center p-10 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            You don&apos;t have access to {org.name}&apos;s users
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only owners and instructors can view the user list.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/me">Back to your organizations</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Users
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everyone with an account in this organization. Owners can update a
          user&apos;s name, email, and password.
        </p>
      </header>

      <MembersTable
        orgSlug={slug}
        members={members}
        viewerRole={org.viewer_role}
      />
    </main>
  );
}
