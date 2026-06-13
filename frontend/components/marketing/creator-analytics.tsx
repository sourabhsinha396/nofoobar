"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { BorderBeam } from "@/components/ui/border-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type CourseData = {
  id: string;
  name: string;
  revenue: { month: string; revenue: number }[];
  stats: {
    revenue: string;
    revenueDelta: string;
    enrollments: string;
    enrollmentsDelta: string;
    freeToPaid: string;
  };
  lessons: { name: string; completion: number }[];
};

const courses: CourseData[] = [
  {
    id: "fastapi",
    name: "Course 1",
    revenue: [
      { month: "Jan", revenue: 1240 },
      { month: "Feb", revenue: 1860 },
      { month: "Mar", revenue: 2410 },
      { month: "Apr", revenue: 3120 },
      { month: "May", revenue: 3940 },
      { month: "Jun", revenue: 4820 },
    ],
    stats: {
      revenue: "$4,820",
      revenueDelta: "+18%",
      enrollments: "212",
      enrollmentsDelta: "+31%",
      freeToPaid: "9.4%",
    },
    lessons: [
      { name: "01 · Why async", completion: 96 },
      { name: "02 · Routes", completion: 54 },
      { name: "03 · Path params", completion: 47 },
    ],
  },
  {
    id: "stripe",
    name: "Course 2",
    revenue: [
      { month: "Jan", revenue: 620 },
      { month: "Feb", revenue: 980 },
      { month: "Mar", revenue: 1310 },
      { month: "Apr", revenue: 1720 },
      { month: "May", revenue: 2180 },
      { month: "Jun", revenue: 2680 },
    ],
    stats: {
      revenue: "$2,680",
      revenueDelta: "+24%",
      enrollments: "96",
      enrollmentsDelta: "+12%",
      freeToPaid: "7.1%",
    },
    lessons: [
      { name: "01 · Checkout", completion: 91 },
      { name: "03 · Webhooks", completion: 52 },
      { name: "04 · Going live", completion: 44 },
    ],
  },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-brand)",
  },
} satisfies ChartConfig;

function biggestDropIndex(lessons: CourseData["lessons"]) {
  let index = -1;
  let maxDrop = 0;
  for (let i = 1; i < lessons.length; i++) {
    const drop = lessons[i - 1].completion - lessons[i].completion;
    if (drop > maxDrop) {
      maxDrop = drop;
      index = i;
    }
  }
  return index;
}

export function CreatorAnalytics() {
  const [course, setCourse] = useState(courses[0]);
  const stallIndex = biggestDropIndex(course.lessons);

  return (
    <section className="border-b border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            For creators
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            See exactly what sells.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Know which free lesson converts, and where students stall.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
          <BorderBeam size={140} duration={9} colorFrom="#d4f268" colorTo="#a78bfa" />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-foreground/15 bg-lime-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-foreground/15 bg-yellow-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-foreground/15 bg-rose-500" />
              <span className="ml-3 text-xs text-muted-foreground">
                your-school/admin
              </span>
            </div>
            <div className="flex gap-1 rounded-full border border-border bg-muted/40 p-1">
              {courses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={course.id === c.id}
                  onClick={() => setCourse(c)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                    course.id === c.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">Revenue · 30 days</p>
              <p className="mt-1 text-2xl font-medium text-foreground">
                {course.stats.revenue}{" "}
                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  {course.stats.revenueDelta}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">New enrollments</p>
              <p className="mt-1 text-2xl font-medium text-foreground">
                {course.stats.enrollments}{" "}
                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  {course.stats.enrollmentsDelta}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">Free → paid</p>
              <p className="mt-1 text-2xl font-medium text-foreground">
                {course.stats.freeToPaid}
              </p>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart
              data={course.revenue}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                width={42}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${value / 1000}k`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}`,
                      " revenue",
                    ]}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="var(--color-revenue)"
                fillOpacity={0.25}
                stroke="var(--color-revenue)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ChartContainer>

          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="mb-4 text-xs text-muted-foreground">
              Lesson completion · {course.name}
            </p>
            <div className="space-y-3">
              {course.lessons.map((lesson, i) => (
                <div key={lesson.name} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 truncate text-foreground md:w-44">
                    {lesson.name}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-chart-brand transition-all duration-500"
                      style={{ width: `${lesson.completion}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-muted-foreground">
                    {lesson.completion}%
                  </span>
                  <span
                    className={cn(
                      "hidden w-32 shrink-0 text-xs text-amber-600 md:inline dark:text-amber-400",
                      i !== stallIndex && "invisible"
                    )}
                  >
                    students stall here
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-muted-foreground">
          Sample data — your dashboard fills in as students enroll.
        </p>
      </div>
    </section>
  );
}
