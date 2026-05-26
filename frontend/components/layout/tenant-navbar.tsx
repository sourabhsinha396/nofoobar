import Link from "next/link";

import { TenantUserMenu } from "@/components/layout/tenant-user-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { getCurrentUser } from "@/lib/auth";
import { getNavLinks, serverTenantPath } from "@/lib/tenant";

interface Props {
  slug: string;
  orgName: string;
  logoUrl: string | null;
}

export async function TenantNavbar({ slug, orgName, logoUrl }: Props) {
  const [user, homeHref, coursesHref, loginHref, signupHref, myLearningHref, navLinks] =
    await Promise.all([
      getCurrentUser(),
      serverTenantPath(slug, "/"),
      serverTenantPath(slug, "/courses"),
      serverTenantPath(slug, "/login"),
      serverTenantPath(slug, "/signup"),
      serverTenantPath(slug, "/my-learning"),
      getNavLinks(slug, "header"),
    ]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="flex items-center">
            {logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary tenant CDN URL; swap to next/image once we constrain the host */}
                <img
                  src={logoUrl}
                  alt=""
                  aria-hidden
                  className="max-h-9 w-auto object-contain rounded-full"
                />
                <span className="pl-4">{orgName}</span>
              </>
            ) : (
              <span className="font-heading text-2xl leading-none tracking-tight text-foreground">
                {orgName}
              </span>
            )}
          </Link>
          <Link
            href={coursesHref}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Courses
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              target={link.open_in_new_tab ? "_blank" : undefined}
              rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <nav className="flex items-center gap-2 md:gap-4">
          <AnimatedThemeToggler
            variant="circle"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:h-4 [&_svg]:w-4"
          />

          {user ? (
            <>
              <Link
                href={myLearningHref}
                className="px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                My Learning
              </Link>
              <TenantUserMenu userName={user.name} userEmail={user.email} />
            </>
          ) : (
            <>
              <Link
                href={loginHref}
                className="px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href={signupHref}
                className="inline-flex items-center rounded-full bg-brand px-4 py-2 font-medium text-brand-foreground transition-opacity hover:opacity-90"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
