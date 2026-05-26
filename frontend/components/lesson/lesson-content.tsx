import type { JSONContent } from "@tiptap/react";

import { ArticleRenderer } from "@/components/lesson/article-renderer";
import { Card } from "@/components/ui/card";
import type { Lesson } from "@/lib/tenant";
import { detectVideoProvider, youtubeEmbedSrc } from "@/lib/tiptap-video-embed";

interface Props {
  lesson: Lesson;
}

function isJsonContent(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && "type" in value;
}

function VideoLessonPlayer({ url, title }: { url: string; title: string }) {
  // YouTube: normalize to the privacy-enhanced (nocookie) embed, matching the
  // article-editor's @tiptap/extension-youtube variant noted in CLAUDE.md.
  const ytEmbed = youtubeEmbedSrc(url);
  if (ytEmbed) {
    return (
      <div data-youtube-video>
        <iframe
          src={ytEmbed}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  const detected = detectVideoProvider(url);
  if (!detected) {
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

  // Native HTML5 video for direct .mp4/.webm/.ogg/.mov links.
  if (detected.provider === "native") {
    return (
      <div data-video-embed="native">
        <video src={detected.src} title={title} controls preload="metadata" playsInline />
      </div>
    );
  }

  // Iframe providers (vimeo, loom, mux). Same data attribute + CSS path as the
  // tiptap VideoEmbed node, so the 16:9 wrapper in globals.css applies.
  return (
    <div data-video-embed={detected.provider}>
      <iframe
        src={detected.src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
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
    return <VideoLessonPlayer url={url} title={lesson.title} />;
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
