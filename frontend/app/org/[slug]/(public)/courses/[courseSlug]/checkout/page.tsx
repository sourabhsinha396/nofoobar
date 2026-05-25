import { Infinity as InfinityIcon, ListChecks } from "lucide-react";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/enrollment/checkout-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import {
  getMyEnrollments,
  getPublishedCourse,
  getTenantOrg,
  serverTenantPath,
  type Currency,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { slug, courseSlug } = await params;

  const [user, course, org] = await Promise.all([
    getCurrentUser(),
    getPublishedCourse(slug, courseSlug),
    getTenantOrg(slug),
  ]);

  if (!user) {
    redirect("/login");
  }

  const coursePath = await serverTenantPath(slug, `/courses/${courseSlug}`);
  if (!course || !org) {
    redirect(coursePath);
  }
  if (!course.price_cents) {
    // Free courses don't need checkout — they enroll directly from the landing.
    redirect(coursePath);
  }
  const enrollments = (await getMyEnrollments(slug)) ?? [];
  if (enrollments.some((e) => e.course_id === course.id)) {
    redirect(coursePath);
  }

  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const connectedProviders = org.payment_accounts.map((a) => a.provider);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Checkout
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Complete your purchase
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{org.name}</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
            {course.title}
          </h2>
          {course.description && (
            <p className="mt-3 text-muted-foreground">{course.description}</p>
          )}

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-3 text-muted-foreground">
              <ListChecks className="size-4 shrink-0" aria-hidden />
              <span>
                {course.sections.length} section{course.sections.length === 1 ? "" : "s"} ·{" "}
                {totalLessons} lesson{totalLessons === 1 ? "" : "s"}
              </span>
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <InfinityIcon className="size-4 shrink-0" aria-hidden />
              <span>Lifetime access</span>
            </li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">
            Base price: {formatPrice(course.price_cents, course.currency)}. Switch currency on the
            right to see equivalent purchasing-power pricing in your local market.
          </p>
        </Card>

        <Card className="h-fit p-6">
          <CheckoutForm
            orgSlug={slug}
            courseSlug={course.slug}
            courseTitle={course.title}
            basePriceCents={course.price_cents}
            baseCurrency={course.currency as Currency}
            connectedProviders={connectedProviders}
            userEmail={user.email}
          />
        </Card>
      </div>
    </main>
  );
}
