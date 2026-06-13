import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ScheduleDemo } from "@/components/layout/schedule-demo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { logout } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/auth";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 font-heading text-2xl leading-none tracking-tight text-foreground"
        >
          <Image src="/images/logo.png" alt="" width={32} height={32} />
          nofoobar
        </Link>

        <nav className="flex items-center gap-2 md:gap-6">
          <Link
            href="/pricing"
            className="hidden transition-colors hover:text-foreground sm:inline-block"
          >
            Pricing
          </Link>
          {/* <Link
            href="/docs"
            className="hidden transition-colors hover:text-foreground sm:inline-block"
          >
            Docs
          </Link> */}
          <Link
            href="https://github.com/sourabhsinha396/nofoobar"
            className="hidden transition-colors hover:text-foreground sm:inline-block"
            target="_blank"
          >
            <span className="flex items-center gap-1">
            GitHub
            </span>
          </Link>

          <ScheduleDemo className="hidden cursor-pointer transition-colors hover:text-foreground sm:inline-block" />

          <AnimatedThemeToggler
            variant="circle"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground [&_svg]:h-4 [&_svg]:w-4"
          />

          {user ? (
            <>
              <Link
                href="/me"
                className="hidden px-3 py-1.5 transition-colors hover:text-foreground sm:inline-block"
              >
                My account
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-1.5 transition-colors hover:text-foreground sm:inline-block"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}

          {/* Below sm, the text links above are hidden; the drawer carries
              them instead. The brand CTA stays in the bar on all sizes. */}
          <MobileNav>
            {user ? (
              <Link
                href="/me"
                className="rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
              >
                My account
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
              >
                Sign in
              </Link>
            )}
          </MobileNav>
        </nav>
      </div>
    </header>
  );
}
