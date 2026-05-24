import { LoginForm } from "@/components/login-form";
import { serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TenantLoginPage({ params }: Props) {
  const { slug } = await params;
  const redirectTo = await serverTenantPath(slug, "/courses");
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
