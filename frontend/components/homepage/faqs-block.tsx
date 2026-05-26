import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqsConfig } from "@/lib/tenant";

export function FaqsBlock({ config }: { config: FaqsConfig }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 md:py-20">
      <h2 className="mb-10 text-center font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {config.heading ?? "Frequently asked questions"}
      </h2>
      <Accordion type="multiple" className="w-full">
        {config.items.map((item, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
