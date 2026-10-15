import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import Icon from "./Icon.jsx";
import { SITE_URL } from "./github.mjs";

// Resolve relative Markdown images and links against the source documents.
// Adding an image under creator/ (including subfolders) makes it available here.
const documentAssets = import.meta.glob(["./**/*", "!./icons/**", "!./*.jsx", "!./*.css", "!./*.mjs"], { eager: true, query: "?url", import: "default" });

function markdownAssetUrl(value) {
  let source = String(value || "");
  try { source = decodeURIComponent(source); } catch { /* Preserve a malformed escape for the Markdown renderer. */ }
  source = source.replaceAll("\\", "/");
  if (/^(?:[a-z]+:|\/\/|\/|#)/i.test(source)) return value;
  const suffixIndex = source.search(/[?#]/);
  const file = suffixIndex < 0 ? source : source.slice(0, suffixIndex);
  const suffix = suffixIndex < 0 ? "" : source.slice(suffixIndex);
  const normalized = `./${file.replace(/^\.\//, "")}`;
  return documentAssets[normalized] ? documentAssets[normalized] + suffix : value;
}

function markdownLinkUrl(value) {
  const resolved = markdownAssetUrl(value);
  try {
    const url = new URL(resolved, SITE_URL);
    if (["fritia.online", "www.fritia.online"].includes(url.hostname.toLowerCase())) return `${SITE_URL}${url.search}${url.hash}`;
  } catch {
    // Retain nonstandard local references for the Markdown renderer.
  }
  return resolved;
}

const components = {
  img: ({ node, src, alt, ...props }) => <img {...props} src={markdownAssetUrl(src)} alt={alt || ""} loading="lazy" decoding="async" />,
  a: ({ node, href, children, ...props }) => <a {...props} href={markdownLinkUrl(href)} {...(/^https?:\/\//i.test(href || "") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>,
  table: ({ node, children, ...props }) => <div className="creator-table-scroll"><table {...props}>{children}</table></div>,
};

export default function MarkdownDocument({ title, icon, raw, browseCards = false }) {
  return (
    <section className="creator-document-panel">
      <div className={`creator-document-heading${browseCards ? " has-action" : ""}`}>
        <span className="creator-section-mark"><Icon name={icon} /></span>
        <h2>{title}</h2>
        {browseCards && <a className="creator-button creator-button-primary creator-browse-button" href="#all"><Icon name="layout-grid" /><span>浏览角色卡</span></a>}
      </div>
      <article className="creator-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeHighlight, { detect: true, ignoreMissing: true }], rehypeKatex]} components={components}>{raw}</ReactMarkdown>
      </article>
      <div className="creator-document-bottom">
        <a className="creator-text-link" href="#all"><Icon name="layout-grid" />去发现社区角色<Icon name="arrow-up-right" /></a>
        <a className="creator-text-link" href="#submit"><Icon name="send" />分享我的创作<Icon name="arrow-up-right" /></a>
      </div>
    </section>
  );
}
