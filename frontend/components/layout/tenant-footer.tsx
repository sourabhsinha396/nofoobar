import { Globe, Mail } from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import {
  getNavLinks,
  getPublishedPages,
  type SocialLink,
  type TenantOrg,
} from "@/lib/tenant";

interface Props {
  slug: string;
  org: TenantOrg;
}

// lucide-react removed brand icons in 2024 (they're no longer maintained),
// so we inline minimal SVG marks for the platforms that need them. Each
// renders at `currentColor`, sized via the standard className.

function GithubMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function TwitterMark(props: SVGProps<SVGSVGElement>) {
  // Modern "X" logo.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<
  SocialLink["platform"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  twitter: TwitterMark,
  linkedin: LinkedinMark,
  youtube: YoutubeMark,
  github: GithubMark,
  website: Globe,
};

const SOCIAL_LABELS: Record<SocialLink["platform"], string> = {
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  github: "GitHub",
  website: "Website",
};

interface FooterLinkItem {
  key: string;
  label: string;
  href: string;
  open_in_new_tab: boolean;
}

export async function TenantFooter({ slug, org }: Props) {
  // Footer link list is the merge of two sources:
  //   1. Author-managed nav_links where location=footer
  //   2. Published pages where show_in_footer=true
  // Pages render first (legal pages usually want top billing), then nav
  // links. Within each source, position-ordered. If admins want a custom
  // order across both, we'd need a unified ordering field — keeping it
  // simple for v1.
  const [navLinks, pages] = await Promise.all([
    getNavLinks(slug, "footer"),
    getPublishedPages(slug),
  ]);

  const footerLinks: FooterLinkItem[] = [
    ...pages
      .filter((p) => p.show_in_footer)
      .map((p) => ({
        key: `page-${p.id}`,
        label: p.title,
        // Relative path — Next.js routes it under the tenant's (public)
        // segment. Stays open in the same tab.
        href: `/${p.slug}`,
        open_in_new_tab: false,
      })),
    ...navLinks.map((l) => ({
      key: `nav-${l.id}`,
      label: l.label,
      href: l.href,
      open_in_new_tab: l.open_in_new_tab,
    })),
  ];

  const copyright =
    org.footer_text?.trim() ||
    `© ${new Date().getFullYear()} ${org.name}`;

  const hasLinks = footerLinks.length > 0;
  const hasSocials = org.social_links.length > 0;
  const hasContact = !!org.contact_email;

  return (
    <footer className="mt-24 border-t border-border bg-background py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary tenant CDN URL
              <img
                src={org.logo_url}
                alt={org.name}
                className="max-h-10 w-auto object-contain"
              />
            ) : (
              <p className="font-heading text-2xl leading-none tracking-tight text-foreground">
                {org.name}
              </p>
            )}
            {org.tagline && (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {org.tagline}
              </p>
            )}
          </div>

          {(hasSocials || hasContact) && (
            <div className="md:text-right">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-foreground">
                Contact
              </h3>
              {hasContact && (
                <a
                  href={`mailto:${org.contact_email}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="size-4" aria-hidden />
                  {org.contact_email}
                </a>
              )}
              {hasSocials && (
                <ul className="mt-4 flex flex-wrap gap-2 md:justify-end">
                  {org.social_links.map((social, idx) => {
                    const Icon = SOCIAL_ICONS[social.platform];
                    return (
                      <li key={idx}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={SOCIAL_LABELS[social.platform]}
                          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                        >
                          <Icon className="size-4" aria-hidden />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {hasLinks && (
            <div className="md:text-right">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-foreground">
                Links
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      target={link.open_in_new_tab ? "_blank" : undefined}
                      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>{copyright}</p>
          <p>
            Powered by{" "}
            <Link
              href="https://nofoobar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground transition-opacity hover:opacity-80"
            >
              nofoobar
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
