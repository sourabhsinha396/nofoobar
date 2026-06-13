import Image from "next/image";
import Link from "next/link";

type FooterColumn = {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
};

const columns: ReadonlyArray<FooterColumn> = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "Docs", href: "/docs" },
      { label: "GitHub", href: "https://github.com/sourabhsinha396/nofoobar" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Self-hosting guide", href: "/docs/self-hosting" },
      { label: "Architecture", href: "/docs/architecture" },
      { label: "Changelog", href: "/changelog" },
      { label: "Issues", href: "https://github.com/sourabhsinha396/nofoobar/issues" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "License (Apache 2.0)", href: "/LICENSE" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "mailto:hi@nofoobar.com" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link
              href="/"
              className="flex w-fit items-center gap-1 font-heading text-3xl leading-none tracking-tight text-foreground"
            >
              <Image src="/images/logo.png" alt="" width={36} height={36} />
              nofoobar
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              An open-source platform for publishing courses, blogs, and
              hands-on coding labs under your own brand.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} nofoobar. Apache 2.0.</p>
          <p>
            Built in public by{" "}
            <Link
              href="https://github.com/sourabhsinha396"
              className="text-foreground transition-opacity hover:opacity-80"
            >
              Sourabh Sinha
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
