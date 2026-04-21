/**
 * Lightweight Markdown → HTML renderer (no external deps)
 * Supports: headings, bold, italic, code, blockquote, lists, hr, links, inline-code
 */
export function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML tags first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks ```lang\n...\n```
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Blockquote > text
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rule
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "<hr/>");

  // Unordered list items
  html = html.replace(/^\s*[-*+] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => `<ul>${m}</ul>`);
  // Merge consecutive uls
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Ordered list items
  html = html.replace(/^\s*\d+\. (.+)$/gm, "<oli>$1</oli>");
  html = html.replace(/(<oli>[\s\S]*?<\/oli>)/g, (m) =>
    `<ol>${m.replace(/<\/?oli>/g, (t) => (t === "<oli>" ? "<li>" : "</li>"))}</ol>`
  );
  html = html.replace(/<\/ol>\s*<ol>/g, "");

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Images ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0;" />'
  );

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: hsl(var(--primary)); text-decoration: underline;">$1</a>'
  );

  // Paragraphs — split by double newline, wrap non-block lines
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  return html;
}
