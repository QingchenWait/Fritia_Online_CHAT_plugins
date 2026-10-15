export const REPOSITORY = "QingchenWait/Fritia_Online_CHAT_plugins";
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
export const SITE_URL = "https://qingchenwait.github.io/Fritia_Online_CHAT_plugins/";
export const ISSUES_URL = `${REPOSITORY_URL}/issues`;
// Use the repository's native form so GitHub handles authentication, uploads,
// required declarations, the title prefix, and the configured character-card label.
// Do not add a labels query: ordinary contributors may not have labeling rights.
export const SUBMISSION_URL = `${ISSUES_URL}/new?template=character-card.yml`;
export const LOGIN_URL = `https://github.com/login?return_to=${encodeURIComponent(`/QingchenWait/Fritia_Online_CHAT_plugins/issues/new?template=character-card.yml`)}`;
export const CARD_LABELS = { all: "初审通过", featured: "精选角色卡" };

export function safeWebUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function markdownText(value = "") {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_`~]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function issueFields(body = "") {
  const fields = {};
  const headings = [...body.replace(/\r\n/g, "\n").matchAll(/^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)];
  const normalized = body.replace(/\r\n/g, "\n");
  headings.forEach((heading, index) => {
    fields[markdownText(heading[1])] = normalized.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? normalized.length).trim();
  });
  return fields;
}

export function avatarFromMarkdown(section = "") {
  const html = section.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  // GitHub issue forms may produce a regular attachment link, not image syntax.
  const markdown = section.match(/!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/);
  const raw = section.match(/https?:\/\/[^\s<>"')]+/);
  return safeWebUrl(html?.[1] || markdown?.[1] || raw?.[0]);
}

export function issueToCard(issue) {
  const fields = issueFields(issue.body || "");
  return {
    id: issue.number,
    name: markdownText(fields["角色卡名称"]) || markdownText(issue.title?.replace(/^\[角色卡投稿\]\s*/, "")) || "未命名角色卡",
    description: markdownText(fields["角色卡介绍"]) || "作者还没有填写角色卡介绍，前往 GitHub 了解更多。",
    avatar: avatarFromMarkdown(fields["头像"]),
    author: issue.user?.login || "GitHub 用户",
    createdAt: issue.created_at,
    url: `${ISSUES_URL}/${issue.number}`,
    featured: issue.labels?.some((label) => (typeof label === "string" ? label : label.name) === CARD_LABELS.featured) || false,
  };
}

export async function fetchCharacterCards(label, { signal, fetchImpl = globalThis.fetch } = {}) {
  const issues = [];
  let page = 1;
  while (true) {
    const url = new URL(`https://api.github.com/repos/${REPOSITORY}/issues`);
    url.search = new URLSearchParams({ state: "open", labels: label, per_page: "100", page: String(page), sort: "created", direction: "desc", _fresh: `${Date.now()}-${page}` });
    const response = await fetchImpl(url, {
      signal,
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!response.ok) {
      const retryAt = response.headers.get("x-ratelimit-reset");
      if (response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")) {
        const time = retryAt ? new Date(Number(retryAt) * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "稍后";
        throw new Error(`GitHub 的访问频率已达上限，请${time === "稍后" ? "稍后" : `在 ${time} 后`}再刷新。也可以直接前往 GitHub 浏览。`);
      }
      throw new Error(`暂时无法读取角色卡（GitHub ${response.status}），请稍后重试。`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("GitHub 返回了无法识别的数据，请稍后重试。");
    issues.push(...batch.filter((issue) => !issue.pull_request && issue.state === "open" && issue.labels?.some((item) => (typeof item === "string" ? item : item.name) === label)));
    const link = response.headers.get("link") || "";
    if (!/<[^>]+>;\s*rel="next"/.test(link)) break;
    page += 1;
  }
  return [...new Map(issues.map((issue) => [issue.number, issueToCard(issue)])).values()];
}

export function filterAndSortCards(cards, query, sort) {
  const normalized = query.trim().toLocaleLowerCase();
  return cards.filter((card) => !normalized || `${card.name} ${card.description} ${card.author}`.toLocaleLowerCase().includes(normalized))
    .sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id;
      return sort === "oldest" ? -diff : diff;
    });
}
