"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { CourseSidebar } from "@/components/course/course-sidebar";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PublishedCourseLanding } from "@/lib/tenant";

interface Props {
  course: PublishedCourseLanding;
  currentSectionSlug: string;
  currentLessonSlug: string;
  lessonHrefPrefix: string;
  children: ReactNode;
}

// v4 of react-resizable-panels expects string percentages. Defaults err on the
// side of "always show lesson titles" without letting the sidebar steal too
// much real estate from the content.
const SIDEBAR_DEFAULT = "15%";
const SIDEBAR_MIN = "5%";
const SIDEBAR_MAX = "30%";
const CONTENT_DEFAULT = "85%";
const CONTENT_MIN = "70%";
const CONTENT_MAX = "95%";

export function LessonView({
  course,
  currentSectionSlug,
  currentLessonSlug,
  lessonHrefPrefix,
  children,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const sidebar = (
    <CourseSidebar
      course={course}
      lessonHrefPrefix={lessonHrefPrefix}
      currentSectionSlug={currentSectionSlug}
      currentLessonSlug={currentLessonSlug}
      onNavigate={() => setSheetOpen(false)}
    />
  );

  return (
    <>
      {/* Mobile: hamburger triggers a Sheet drawer with the sidebar */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open course menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetTitle className="sr-only">Course curriculum</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <p className="truncate text-sm font-medium text-muted-foreground">
            {course.title}
          </p>
        </div>
        <main className="px-4 py-8 sm:px-6">{children}</main>
      </div>

      {/* Desktop: resizable two-pane layout. Height = viewport minus the
          navbar's h-16 AND its 1px bottom border - without the 1px the page
          overflows the viewport by exactly that border and the window grows
          a second scrollbar alongside the content pane's. */}
      <div className="hidden h-[calc(100vh-4rem-1px)] lg:block">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel
            defaultSize={SIDEBAR_DEFAULT}
            minSize={SIDEBAR_MIN}
            maxSize={SIDEBAR_MAX}
            className="border-r border-border"
          >
            {sidebar}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={CONTENT_DEFAULT}
            minSize={CONTENT_MIN}
            maxSize={CONTENT_MAX}
          >
            <div className="h-full overflow-y-auto">
              {/* Query container = the scroll content box (panel minus the
                  scrollbar), the same box the reading column below is centered
                  in. It must NOT be the scrolling element itself - cqw on a
                  scroll container includes the scrollbar gutter, which throws
                  the lab's breakout off-center. Lets a lab embed span the panel
                  - see [data-lab-embed] in globals.css. */}
              <div className="[container-name:lesson-content] [container-type:inline-size]">
                <div className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16">
                  {children}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}
