import { Card } from "@/components/ui/card";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TenantCatalog({ params }: Props) {
  const { slug } = await params;
  const org = await getTenantOrg(slug);

  const name = org?.name ?? slug;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Welcome to
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {name}
        </h1>
        {org?.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{org.description}</p>
        )}
      </header>

      <section>
        <Card className="items-center p-10 text-center">
          <p className="text-muted-foreground">Course catalog coming soon.</p>
        </Card>
      </section>
    </main>
  );
}
