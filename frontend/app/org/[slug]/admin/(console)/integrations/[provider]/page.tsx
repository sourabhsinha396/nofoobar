import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { IntegrationDetail } from "@/components/integrations/integration-detail";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_LABEL, PROVIDER_META, isIntegrationProvider } from "@/lib/integrations";
import { getAvailableIntegrations, getOrgIntegrations, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; provider: string }>;
}

export default async function IntegrationDetailPage({ params }: Props) {
  const { slug, provider } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isIntegrationProvider(provider)) {
    notFound();
  }

  const meta = PROVIDER_META[provider];
  const Icon = meta.icon;

  const [available, integrations, listHref] = await Promise.all([
    getAvailableIntegrations(slug),
    getOrgIntegrations(slug),
    serverTenantPath(slug, "/admin/integrations"),
  ]);

  const entry = available?.find((item) => item.provider === provider);
  if (!available || !entry) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
        <BackLink href={listHref} />
        <Card className="mt-6 items-center p-10 text-center">
          <p className="text-muted-foreground">
            Couldn&apos;t load this integration. Only the org owner can manage these.
          </p>
        </Card>
      </main>
    );
  }

  const mine = (integrations ?? []).filter((item) => item.provider === provider);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
      <BackLink href={listHref} />

      <header className="mt-6 flex items-start gap-3">
        <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-6 text-foreground" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              {meta.label}
            </h1>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {PLAN_LABEL[entry.min_plan]}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{meta.description}</p>
        </div>
      </header>

      <div className="mt-8">
        {!entry.allowed ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <Lock className="size-4 shrink-0" />
            <span>Available on the {PLAN_LABEL[entry.min_plan]} plan and above.</span>
          </div>
        ) : (
          <IntegrationDetail orgSlug={slug} provider={provider} integrations={mine} />
        )}
      </div>
    </main>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      All integrations
    </Link>
  );
}
