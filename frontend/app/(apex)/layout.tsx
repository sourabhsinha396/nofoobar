import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { ScrollProgress } from "@/components/ui/scroll-progress";

// Social-share defaults for the marketing site only. Scoped to the (apex)
// route group so the nofoobar card never attaches to white-label tenant pages.
// og:title / og:description are intentionally omitted - Next fills them from
// each page's resolved title and description. The image path resolves to an
// absolute URL via metadataBase (set in the root layout).
export const metadata: Metadata = {
  openGraph: {
    type: "website",
    siteName: "nofoobar",
    locale: "en_US",
    images: [
      {
        url: "/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "nofoobar, open-source LMS for course creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og.jpg"],
  },
};

export default function ApexLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <ScrollProgress className="bg-brand bg-none" />
      {children}
    </>
  );
}
