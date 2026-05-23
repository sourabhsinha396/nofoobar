import Link from "next/link";

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
        <Link
          href="/"
          className="font-heading text-2xl leading-none tracking-tight text-foreground"
        >
          algoholic
        </Link>

        <nav className="flex items-center gap-2 text-sm md:gap-6">
          <Link
            href="/pricing"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Docs
          </Link>
          <Link
            href="https://github.com/sourabhsinha396/algoholic"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            GitHub
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
