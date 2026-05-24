import { Card } from "@/components/ui/card";

export default function CourseLandingPage() {
  return (
    <section className="space-y-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Course landing page</h2>
      <Card className="items-center p-10 text-center">
        <p className="text-muted-foreground">Landing page editor coming soon.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cover image, instructor bio, target audience, learning outcomes.
        </p>
      </Card>
    </section>
  );
}
