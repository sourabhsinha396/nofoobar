"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ScheduleDemo } from "@/components/layout/schedule-demo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const itemClass =
  "rounded-md px-3 py-2.5 text-left text-base font-medium text-foreground transition-colors hover:bg-accent";

// Hamburger + drawer for the marketing navbar below the `sm` breakpoint. The
// nav links themselves close the sheet on tap; `children` (auth links passed
// in from the server-rendered Navbar) can't take an onClick, so the pathname
// effect closes the sheet after any navigation completes.
export function MobileNav({ children }: { children?: ReactNode }) {
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
          <Link href="/pricing" onClick={() => setOpen(false)} className={itemClass}>
            Pricing
          </Link>
          <Link
            href="https://github.com/sourabhsinha396/nofoobar"
            target="_blank"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            GitHub
          </Link>
          <ScheduleDemo className={itemClass} />
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
