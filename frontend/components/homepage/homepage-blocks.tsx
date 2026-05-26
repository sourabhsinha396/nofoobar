import { FaqsBlock } from "@/components/homepage/faqs-block";
import { FeaturedCoursesBlock } from "@/components/homepage/featured-courses-block";
import { HeroBlock } from "@/components/homepage/hero-block";
import { StatsBlock } from "@/components/homepage/stats-block";
import { TestimonialsBlock } from "@/components/homepage/testimonials-block";
import type { HomepageBlock, PublishedCourseSummary } from "@/lib/tenant";

interface Props {
  blocks: HomepageBlock[];
  courses: PublishedCourseSummary[];
  coursesPrefix: string;
}

export function HomepageBlocks({ blocks, courses, coursesPrefix }: Props) {
  return (
    <>
      {blocks.map((block) => {
        // Discriminator is on block.config.type — switch on that so TS narrows
        // the config payload per branch.
        const cfg = block.config;
        switch (cfg.type) {
          case "hero":
            return <HeroBlock key={block.id} config={cfg} />;
          case "stats":
            return <StatsBlock key={block.id} config={cfg} />;
          case "featured_courses":
            return (
              <FeaturedCoursesBlock
                key={block.id}
                config={cfg}
                courses={courses}
                coursesPrefix={coursesPrefix}
              />
            );
          case "testimonials":
            return <TestimonialsBlock key={block.id} config={cfg} />;
          case "faqs":
            return <FaqsBlock key={block.id} config={cfg} />;
        }
      })}
    </>
  );
}
