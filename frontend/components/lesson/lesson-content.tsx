import type { JSONContent } from "@tiptap/react";

import { ArticleRenderer } from "@/components/lesson/article-renderer";
import { Card } from "@/components/ui/card";
import type { Lesson } from "@/lib/tenant";

interface Props {
  lesson: Lesson;
}

// Extract a YouTube video ID from common URL shapes; returns null otherwise so
// we fall back to a generic link instead of embedding something unsupported.
function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.slice("/embed/".length);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isJsonContent(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && "type" in value;
}

export function LessonContent({ lesson }: Props) {
  if (lesson.content_type === "article") {
    const body = lesson.content.body;
    if (!isJsonContent(body)) {
      return (
        <Card className="items-center p-10 text-center">
          <p className="text-muted-foreground">No content yet.</p>
        </Card>
      );
    }
    return <ArticleRenderer doc={body} />;
  }

  if (lesson.content_type === "video") {
    const url = typeof lesson.content.url === "string" ? lesson.content.url : "";
    const ytId = youtubeId(url);
    if (ytId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Video URL:</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 break-all font-mono text-sm hover:underline"
        >
          {url}
        </a>
      </Card>
    );
  }

  return (
    <Card className="items-center p-10 text-center">
      <p className="text-muted-foreground">
        {lesson.content_type === "lab" ? "Lab" : "Quiz"} view coming in v2.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Raw content stored under <span className="font-mono">content</span> in the database.
      </p>
    </Card>
  );
}
