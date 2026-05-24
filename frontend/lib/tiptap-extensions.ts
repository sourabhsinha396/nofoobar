import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Shared TipTap extensions used by both the client editor and the server-side
// HTML renderer. Keeping them in one list guarantees the renderer can
// faithfully serialize anything the editor produces.
export const TIPTAP_EXTENSIONS = [StarterKit];

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
