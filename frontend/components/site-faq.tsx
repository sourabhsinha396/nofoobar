import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "How do I get paid for my courses?",
    answer:
      "Stripe Connect — money flows directly to your Stripe account, on Stripe's standard payout schedule. We never sit between you and your revenue.",
  },
  {
    question: "Do you charge transaction fees on top of Stripe?",
    answer:
      "No. Stripe's standard fee (2.9% + 30¢ in the US, varies by country) is what you pay on a sale. Algoholic takes nothing on payments — only the monthly hosting subscription if you're on Starter or Pro.",
  },
  {
    question: "What's included in the AI features?",
    answer:
      "Starter includes 10 AI blog drafts per month. Pro removes that limit and adds the AI quiz generator. Both let you fully edit the output before publishing — nothing ships without you signing off.",
  },
  {
    question: "Is there a free trial on the hosted version?",
    answer:
      "Yes — 14 days on Starter and Pro, no card required. Self-host is always free and never expires.",
  },
  {
    question: "Can I self-host?",
    answer:
      "Yes. The full repo is Apache 2.0. A docker compose brings the stack up locally; the same containers run in production. The self-hosted version has every feature — there is no paid tier hidden behind a feature flag.",
  },
  {
    question: "Who owns my data?",
    answer:
      "You. Your Postgres database, your file storage. We never sell to advertisers and never share with third parties beyond the integrations you wire up. If you leave, you take your data with you.",
  },
  {
    question: "Can I migrate from another platform?",
    answer:
      "Planned for V2. For now, the API supports bulk import — bring CSV or JSON and we can help script the move, especially for the first wave of paying customers.",
  },
];

export function SiteFaq() {
  return (
    <section className="border-b border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center md:mb-16">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Common questions
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Answers.
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`}>
              <AccordionTrigger className="py-6 text-base md:py-7 md:text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-7 text-base leading-relaxed text-muted-foreground md:pb-8">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
