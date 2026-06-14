import { Blocks, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  PLAN_LABEL,
  PROVIDER_META,
  integrationsForProvider,
  sortAvailableIntegrations,
} from "@/lib/integrations";
import {
  getAvailableIntegrations,
  getOrgIntegrations,
  serverTenantPath,
  type AvailableIntegration,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function IntegrationsSettingsPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [available, integrations, prefix] = await Promise.all([
    getAvailableIntegrations(slug),
    getOrgIntegrations(slug),
    serverTenantPath(slug, "/admin/integrations"),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          <Blocks className="size-8 text-muted-foreground" />
          Integrations
        </h1>
        <p className="mt-2 text-muted-foreground">
          Connect nofoobar to the tools you already use. Integrations fire on events like new
          enrollments.
        </p>
      </header>

      {available === null ? (
        <Card className="items-center p-10 text-center">
          <p className="text-muted-foreground">
            Couldn&apos;t load integrations. Only the org owner can manage these.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border p-0">
          {sortAvailableIntegrations(available, integrations).map((item) => (
            <IntegrationRow
              key={item.provider}
              href={`${prefix}/${item.provider}`}
              available={item}
              count={integrationsForProvider(integrations, item.provider).length}
            />
          ))}
        </Card>
      )}
    </main>
  );
}

function IntegrationRow({
  href,
  available,
  count,
}: {
  href: string;
  available: AvailableIntegration;
  count: number;
}) {
  const meta = PROVIDER_META[available.provider];
  const Icon = meta.icon;

  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-5 py-4 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{meta.label}</h2>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {PLAN_LABEL[available.min_plan]}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusLabel available={available} count={count} />
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function StatusLabel({ available, count }: { available: AvailableIntegration; count: number }) {
  if (!available.allowed) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <Lock className="size-3.5" />
        {PLAN_LABEL[available.min_plan]}
      </span>
    );
  }
  if (count > 0) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 sm:flex">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        {count} connected
      </span>
    );
  }
  return (
    <span className="hidden text-xs text-muted-foreground sm:block">Not connected</span>
  );
}
