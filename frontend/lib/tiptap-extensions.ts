import Youtube from "@tiptap/extension-youtube";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { VideoEmbed } from "@/lib/tiptap-video-embed";

// Shared TipTap extensions used by both the client editor and the server-side
// HTML renderer. Keeping them in one list guarantees the renderer can
// faithfully serialize anything the editor produces.
//
// Youtube — nocookie variant (privacy-enhanced; no tracking cookies until the
// learner hits play). The width/height attributes are still emitted but the
// renderer overrides with a responsive 16:9 wrapper via [data-youtube-video].
//
// VideoEmbed — our custom node for Vimeo / Loom iframes and HTML5 <video> for
// direct .mp4 URLs. YouTube intentionally stays in its dedicated extension.
export const TIPTAP_EXTENSIONS = [
  StarterKit,
  Youtube.configure({
    nocookie: true,
    controls: true,
    disableKBcontrols: false,
    autoplay: false,
    modestBranding: true,
  }),
  VideoEmbed,
];

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
