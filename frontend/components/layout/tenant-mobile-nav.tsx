"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface TenantNavItem {
  key: string;
  href: string;
  label: string;
  external?: boolean;
}

const itemClass =
  "rounded-md px-3 py-2.5 text-left text-base font-medium text-foreground transition-colors hover:bg-accent";

// Hamburger + drawer for the tenant storefront navbar below the `sm` breakpoint.
// Mirrors the apex MobileNav, but the tenant's links are dynamic (Courses +
// per-tenant nav links + the auth link), so they're passed in prebuilt rather
// than hardcoded. The pathname effect closes the drawer after any navigation.
export function TenantMobileNav({ items }: { items: TenantNavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="sm:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <nav className="mt-10 flex flex-col gap-1 px-4">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
