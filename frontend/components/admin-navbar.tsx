import Link from "next/link";

import { AdminUserMenu } from "@/components/admin-user-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { getCurrentUser } from "@/lib/auth";
import { tenantUrl } from "@/lib/orgs";
import { serverTenantPath } from "@/lib/tenant";

interface Props {
  slug: string;
  orgName: string;
}

export async function AdminNavbar({ slug, orgName }: Props) {
  const [user, adminHomeHref] = await Promise.all([
    getCurrentUser(),
    serverTenantPath(slug, "/admin"),
  ]);
  const viewSiteHref = tenantUrl(slug, "/");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={adminHomeHref}
            className="font-heading text-2xl leading-none tracking-tight text-foreground"
          >
            {orgName}
          </Link>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Admin
          </span>
        </div>

        <nav className="flex items-center gap-2 text-sm md:gap-4">
          <Link
            href={viewSiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            View site
          </Link>

          <AnimatedThemeToggler
            variant="circle"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:h-4 [&_svg]:w-4"
          />

          {user && <AdminUserMenu userName={user.name} userEmail={user.email} />}
        </nav>
      </div>
    </header>
  );
}
