import { Node, mergeAttributes } from "@tiptap/core";

// Interactive labs live in a separate service (algoholia.com) and are embedded
// through an <iframe>. Creators paste the iframe snippet the labs service gives
// them; we detect the org namespace + embed id and re-render our own styled
// iframe rather than trusting the pasted markup verbatim.
//
// Host of the labs service. Configurable for dev/staging, but the embed URL we
// build is always rooted here - we never render a host pulled from pasted HTML.
const LABS_HOST = process.env.NEXT_PUBLIC_LABS_HOST ?? "https://algoholia.com";

export interface ParsedLabEmbed {
  org: string;
  embedId: string;
}

// Lab embed ids are UUIDs (8-4-4-4-12 hex). Anchored so a stray suffix doesn't
// sneak through.
const EMBED_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pure parser shared by the editor dialog (and any future paste handler) so the
// detection logic has a single, well-tested surface. Accepts either a full
// <iframe …> snippet or a bare embed URL. Returns null when the input isn't a
// recognisable algoholia lab embed.
//
// Security: we only accept algoholia-hosted URLs. Pasted iframe markup is
// otherwise an arbitrary-embed vector - a creator could point the frame at any
// site. We extract org + embedId and rebuild the src ourselves (see
// labEmbedSrc), so the stored doc never carries attacker-controlled HTML.
export function parseLabEmbed(input: string): ParsedLabEmbed | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Prefer the src="…" of a pasted iframe; fall back to treating the whole
  // string as a bare URL.
  const srcMatch = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  const candidate = srcMatch ? srcMatch[1] : trimmed;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== "algoholia.com" && !host.endsWith(".algoholia.com")) return null;

  // Path shape: /<org>/embed/<embedId>
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[1] !== "embed") return null;

  const [org, , embedId] = segments;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(org)) return null;
  if (!EMBED_ID_RE.test(embedId)) return null;

  return { org: org.toLowerCase(), embedId: embedId.toLowerCase() };
}

// Canonical embed URL we control - always rooted at LABS_HOST regardless of
// what host the creator pasted from.
export function labEmbedSrc(org: string, embedId: string): string {
  return `${LABS_HOST.replace(/\/+$/, "")}/${org}/embed/${embedId}`;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    algoholiaLab: {
      setAlgoholiaLab: (options: ParsedLabEmbed) => ReturnType;
    };
  }
}

// Custom node for an embedded interactive lab. Stores {org, embedId} on the
// TipTap JSON (the durable identifiers) and rebuilds the iframe src at render
// time. Atom = single leaf block, no editable content inside. Round-trips
// through HTML via data-lab-* attributes so generateHTML (SSR renderer) works.
export const AlgoholiaLab = Node.create({
  name: "algoholiaLab",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      org: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-lab-org"),
      },
      embedId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-lab-embed-id"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-lab-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const org = (HTMLAttributes.org as string) ?? "";
    const embedId = (HTMLAttributes.embedId as string) ?? "";

    return [
      "div",
      mergeAttributes({
        "data-lab-embed": "",
        "data-lab-org": org,
        "data-lab-embed-id": embedId,
      }),
      [
        "iframe",
        {
          src: labEmbedSrc(org, embedId),
          frameborder: "0",
          // clipboard-write lets the lab's "copy" buttons work; fullscreen
          // (both the Permissions-Policy `allow` entry and the legacy
          // allowfullscreen attribute) lets the lab's Full screen button
          // render - it hides itself when document.fullscreenEnabled is false.
          allow: "clipboard-write; fullscreen",
          allowfullscreen: "true",
          loading: "lazy",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setAlgoholiaLab:
        ({ org, embedId }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { org, embedId },
          });
        },
    };
  },
});
