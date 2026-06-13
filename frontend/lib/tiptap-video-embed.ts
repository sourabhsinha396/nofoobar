import { Node, mergeAttributes } from "@tiptap/core";

// Providers we render ourselves. YouTube is handled by @tiptap/extension-youtube
// and isn't part of this node - see detectVideoProvider() for the dispatch.
export type VideoProvider = "vimeo" | "loom" | "mux" | "native";

export type DetectedVideo =
  | { provider: "youtube"; src: string }
  | { provider: VideoProvider; src: string };

// Pure URL → provider mapper. Centralized so the detection logic has a small
// test surface and the editor + any future paste handlers share the same
// behavior. Returns null when no supported provider matches.
export function detectVideoProvider(url: string): DetectedVideo | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube - leave src as-is; @tiptap/extension-youtube does its own parsing.
  if (
    /^https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/i.test(
      trimmed,
    )
  ) {
    return { provider: "youtube", src: trimmed };
  }

  // Vimeo - normalize any vimeo.com URL to the embed player URL.
  const vimeo = trimmed.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { provider: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  // Loom - normalize share/embed URLs to the embed form. IDs are hex.
  const loom = trimmed.match(/^https?:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([a-f0-9]+)/i);
  if (loom) {
    return { provider: "loom", src: `https://www.loom.com/embed/${loom[1]}` };
  }

  // Mux - player.mux.com/<playback_id> with optional query string preserved
  // (Mux uses query params for Mux Data metadata and player config like
  // autoplay/primary-color, so we keep them rather than stripping).
  const mux = trimmed.match(/^https?:\/\/(?:www\.)?player\.mux\.com\/([\w-]+)(\?[^#]*)?/i);
  if (mux) {
    return { provider: "mux", src: `https://player.mux.com/${mux[1]}${mux[2] ?? ""}` };
  }

  // Direct media file. mp4/webm are the safe bets; mov/ogg work in most
  // browsers too. Permits query string and fragment after the extension.
  if (/\.(mp4|webm|ogg|mov)(?:[?#]|$)/i.test(trimmed)) {
    return { provider: "native", src: trimmed };
  }

  return null;
}

// Normalise common YouTube URL shapes (watch?v=, youtu.be/, /shorts/, /embed/)
// to the privacy-enhanced no-cookie embed form. Returns null if the URL isn't
// a recognisable YouTube link. Used by lesson renderers and the upload-picker
// preview to render YouTube in the same nocookie iframe @tiptap/extension-youtube
// produces inside the article editor.
export function youtubeEmbedSrc(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  let id: string | null = null;
  if (parsed.hostname === "youtu.be") {
    id = parsed.pathname.slice(1) || null;
  } else if (parsed.hostname.endsWith("youtube.com")) {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.slice("/embed/".length);
    else if (parsed.pathname.startsWith("/shorts/")) id = parsed.pathname.slice("/shorts/".length);
  }
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (options: { src: string; provider: VideoProvider }) => ReturnType;
    };
  }
}

// Custom node for Vimeo/Loom iframes and HTML5 <video> embeds. Stored as
// {src, provider} on the TipTap JSON; renderHTML branches on provider.
// Atom = single leaf block, no editable content inside.
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("iframe, video")?.getAttribute("src") ?? null,
      },
      provider: {
        default: "native" as VideoProvider,
        parseHTML: (element) =>
          (element.getAttribute("data-video-embed") as VideoProvider | null) ?? "native",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const provider = (HTMLAttributes.provider as VideoProvider) ?? "native";
    const src = (HTMLAttributes.src as string) ?? "";

    if (provider === "native") {
      return [
        "div",
        mergeAttributes({ "data-video-embed": "native" }),
        [
          "video",
          {
            src,
            controls: "",
            preload: "metadata",
            playsinline: "",
          },
        ],
      ];
    }

    return [
      "div",
      mergeAttributes({ "data-video-embed": provider }),
      [
        "iframe",
        {
          src,
          frameborder: "0",
          allow: "autoplay; fullscreen; picture-in-picture",
          allowfullscreen: "",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        ({ src, provider }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { src, provider },
          });
        },
    };
  },
});
