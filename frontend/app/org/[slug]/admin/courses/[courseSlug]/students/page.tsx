import { Card } from "@/components/ui/card";

export default function StudentsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Students</h2>
      <Card className="items-center p-10 text-center">
        <p className="text-muted-foreground">Student roster and progress views coming soon.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enrolled list, completion rates, last activity, manual access grants.
        </p>
      </Card>
    </section>
  );
}
