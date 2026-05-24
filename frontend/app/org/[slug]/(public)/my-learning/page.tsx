import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MyLearningPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(await serverTenantPath(slug, "/login"));
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          My Learning
        </h1>
        <p className="mt-2 text-muted-foreground">Your enrolled courses will appear here.</p>
      </header>
      <Card className="items-center p-10 text-center">
        <p className="text-muted-foreground">Enrollment is coming soon.</p>
      </Card>
    </main>
  );
}
