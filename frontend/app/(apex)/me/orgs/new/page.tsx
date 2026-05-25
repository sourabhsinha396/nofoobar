import { redirect } from "next/navigation";

import { CreateOrgForm } from "@/components/auth/create-org-form";
import { getCurrentUser } from "@/lib/auth";

export default async function NewOrgPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
      <CreateOrgForm />
    </main>
  );
}
