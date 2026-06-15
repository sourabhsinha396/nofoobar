// Renders a JSON-LD structured-data <script>. Escapes "<" to its unicode form
// so user-supplied strings (org names, course titles/descriptions) can't break
// out of the <script> tag - the XSS guard the Next.js JSON-LD guide calls for.
// A native <script> (not next/script) is correct here: this is data, not code.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
