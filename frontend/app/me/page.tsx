import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { getMyOrgs, tenantUrl, type Role } from "@/lib/orgs";

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  instructor: "Instructor",
  student: "Student",
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const memberships = await getMyOrgs();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Hi, {user.name}
          </h1>
          <p className="mt-2 text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="lg">
            Sign out
          </Button>
        </form>
      </header>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Your organizations
          </h2>
          <Button asChild size="lg">
            <Link href="/me/orgs/new">Create organization</Link>
          </Button>
        </div>

        {memberships.length === 0 ? (
          <Card className="items-center p-10 text-center">
            <p className="text-muted-foreground">
              You don&apos;t belong to any organizations yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one to publish courses and invite people.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {memberships.map(({ org, role }) => (
              <li key={org.id}>
                <Link href={tenantUrl(org.slug)} className="block">
                  <Card className="flex flex-row items-center justify-between p-5 transition-colors hover:border-foreground/20">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {ROLE_LABELS[role]}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
