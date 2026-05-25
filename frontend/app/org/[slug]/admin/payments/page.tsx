import { redirect } from "next/navigation";

import { DisconnectPaymentAccountButton } from "@/components/disconnect-payment-account-button";
import { PaymentAccountForm } from "@/components/payment-account-form";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentAccounts, type PaymentAccount, type PaymentProvider } from "@/lib/tenant";

const SUPPORTED_PROVIDERS: { provider: PaymentProvider; label: string; subtitle: string }[] = [
  {
    provider: "stripe",
    label: "Stripe",
    subtitle: "Accept cards, Apple Pay, Google Pay and more. Best for USD/EUR/GBP.",
  },
  {
    provider: "razorpay",
    label: "Razorpay",
    subtitle: "Accept UPI, cards, netbanking, and wallets. Best for INR-priced courses.",
  },
];

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PaymentsSettingsPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const accounts = (await getPaymentAccounts(slug)) ?? [];
  const accountByProvider = new Map<PaymentProvider, PaymentAccount>(
    accounts.map((account) => [account.provider, account]),
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Payment providers
        </h1>
        <p className="mt-2 text-muted-foreground">
          Connect a provider to start accepting paid course enrollments. You stay the merchant of
          record — money goes directly to your account.
        </p>
      </header>

      <div className="space-y-6">
        {SUPPORTED_PROVIDERS.map(({ provider, label, subtitle }) => {
          const existing = accountByProvider.get(provider);
          const isConnected = existing !== undefined;
          return (
            <Card key={provider} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-semibold">{label}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                  {isConnected && (
                    <p className="mt-3 text-sm">
                      Connected as{" "}
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {existing.key_id}
                      </span>
                    </p>
                  )}
                </div>
                {isConnected && (
                  <DisconnectPaymentAccountButton
                    orgSlug={slug}
                    provider={provider}
                    providerLabel={label}
                  />
                )}
              </div>
              <Separator className="my-6" />
              <PaymentAccountForm
                orgSlug={slug}
                provider={provider}
                existingKeyId={existing?.key_id}
              />
            </Card>
          );
        })}
      </div>
    </main>
  );
}
