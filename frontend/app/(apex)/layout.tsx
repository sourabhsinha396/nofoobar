import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { ScrollProgress } from "@/components/ui/scroll-progress";

export default function ApexLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <ScrollProgress className="bg-brand bg-none" />
      {children}
    </>
  );
}
