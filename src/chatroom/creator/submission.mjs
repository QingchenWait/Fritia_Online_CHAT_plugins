import { ISSUES_URL, REPOSITORY } from "./github.mjs";

export const TITLE_PREFIX = "[角色卡投稿] ";
export const REQUIRED_DECLARATIONS = [
  "我已经阅读了共创计划的介绍和要求，确保角色卡格式正确。",
  "我确认角色卡是以分析员（用户）为核心的纯爱/后宫作品，不包含 NTR/百合/猎奇XP 等与社区调性不符的内容。",
  "我保证上传的所有内容不包含暴力/恐怖/涉政/生理不适/版权争议等违法违规内容。",
];
export const OPTIONAL_DECLARATIONS = [
  "我授权该角色卡并入《海姆休息室》官方分支，并授权官方在并入时进行适度修改。",
  "我授权《海姆休息室》官方在第三方平台宣发时，在标注作者的前提下使用该角色卡。",
];
export const FILE_RULES = {
  avatar: { title: "头像", extensions: ["png", "jpg", "jpeg", "webp"], maxBytes: 5 * 1024 * 1024, mime: { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" } },
  prompt: { title: "人格提示词", extensions: ["txt"], maxBytes: 1024 * 1024, mime: { txt: "text/plain" } },
  voice: { title: "参考语音", extensions: ["mp3", "wav"], maxBytes: 20 * 1024 * 1024, mime: { mp3: "audio/mpeg", wav: "audio/wav" } },
};
export const countCharacters = (text) => [...String(text || "")].length;

export function validateFile(file, kind) {
  const rule = FILE_RULES[kind];
  if (!file) return `请上传${rule.title}。`;
  if (!rule.extensions.includes(file.name.split(".").pop().toLowerCase())) return `请选择 ${rule.extensions.map((extension) => extension.toUpperCase()).join(" / ")} 文件。`;
  if (!file.size) return "文件为空，请重新选择。";
  if (file.size > rule.maxBytes) return `文件过大，${rule.title}最大支持 ${rule.maxBytes / 1024 / 1024} MB。`;
  return "";
}

export function validateSubmission(draft, files, required) {
  const errors = {};
  if (!draft.title.trim()) errors.title = "请填写投稿标题。";
  if (countCharacters(TITLE_PREFIX + draft.title.trim()) > 256) errors.title = "投稿标题过长。";
  if (!draft.name.trim()) errors.name = "请填写角色卡名称。";
  if (!draft.description.trim() || countCharacters(draft.description) > 60) errors.description = "请填写 60 字符以内的角色卡介绍。";
  if (countCharacters(draft.detail) > 1000) errors.detail = "详细描述最多 1000 字符。";
  for (const kind of Object.keys(FILE_RULES)) {
    const problem = validateFile(files[kind], kind);
    if (problem) errors[kind] = problem;
  }
  if (required.length !== 3 || !required.every((value) => value === true)) errors.declarations = "请勾选全部三项必要上传声明。";
  return errors;
}

function attachment(name, url, image = false) {
  const safeName = name.replace(/[\[\]\\\r\n]/g, "_");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("附件链接必须使用 HTTPS。");
  return `${image ? "!" : ""}[${safeName}](${parsed.href})`;
}

export function issuePayload(draft, files, urls, optional = [false, false]) {
  return {
    title: TITLE_PREFIX + draft.title.trim(),
    body: [
      "<!-- heim-character-card:v1 -->",
      `### 角色卡名称\n\n${draft.name.trim()}`,
      `### 角色卡介绍\n\n${draft.description.trim()}`,
      `### 详细描述\n\n${draft.detail.trim() || "_No response_"}`,
      `### 头像\n\n${attachment(files.avatar.name, urls.avatar, true)}`,
      `### 人格提示词\n\n${attachment(files.prompt.name, urls.prompt)}`,
      `### 参考语音\n\n${attachment(files.voice.name, urls.voice)}`,
      `### 必要上传声明\n\n${REQUIRED_DECLARATIONS.map((text) => `- [x] ${text}`).join("\n")}`,
      `### 可选声明\n\n${OPTIONAL_DECLARATIONS.map((text, index) => `- [${optional[index] ? "x" : " "}] ${text}`).join("\n")}`,
    ].join("\n\n"),
    // Contributors cannot label issues themselves. The repository workflow adds
    // this label on opened issues after checking the form structure.
    labels: ["角色卡"],
  };
}

export async function verifyGitHubToken(token, fetchImpl = globalThis.fetch) {
  if (!token) throw new Error("GitHub 授权已失效，请重新登录。");
  const response = await fetchImpl("https://api.github.com/user", {
    cache: "no-store", credentials: "omit",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("无法验证 GitHub 身份，请重新登录授权。");
  const user = await response.json();
  if (!user.login || !user.id) throw new Error("未能获取有效的 GitHub 身份。");
  const scopes = response.headers.get("x-oauth-scopes");
  if (scopes !== null && !scopes.split(/,\s*/).some((scope) => ["public_repo", "repo"].includes(scope))) throw new Error("尚未获得 GitHub 公开仓库投稿权限，请重新登录授权。");
  return user;
}

export async function submitCharacterCard({ client, bucket, userId, githubUserId, token, draft, files, required, optional, onProgress = () => {}, fetchImpl = globalThis.fetch }) {
  const errors = validateSubmission(draft, files, required);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const text = await files.prompt.text();
  if (text.includes("\u0000") || text.includes("\ufffd")) throw new Error("人格提示词请使用 UTF-8 编码的 TXT 纯文本文件。");
  if (countCharacters(text.trim()) < 1000) throw new Error("人格提示词需要至少 1000 字，请补充后重新上传。");
  onProgress("正在核实 GitHub 身份…");
  const identity = await verifyGitHubToken(token, fetchImpl);
  if (String(identity.id) !== String(githubUserId)) throw new Error("GitHub 身份与当前登录账号不一致，请重新登录。");
  const submissionId = crypto.randomUUID();
  const urls = {};
  // Keep attachments after a failed POST: the request might have reached GitHub
  // even if the browser missed the response. Never break a successfully created
  // issue by deleting its files on an ambiguous network failure.
  for (const kind of ["avatar", "prompt", "voice"]) {
    const rule = FILE_RULES[kind];
    const extension = files[kind].name.split(".").pop().toLowerCase();
    const objectPath = `${userId}/${submissionId}/${kind}.${extension}`;
    onProgress(`正在上传${rule.title}…`);
    const { error } = await client.storage.from(bucket).upload(objectPath, files[kind], {
      cacheControl: "3600", upsert: false, contentType: rule.mime[extension],
    });
    if (error) throw new Error(`${rule.title}上传失败：${error.message}`);
    urls[kind] = client.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  }
  onProgress("正在提交到 GitHub…");
  let response;
  try {
    response = await fetchImpl(`https://api.github.com/repos/${REPOSITORY}/issues`, {
      method: "POST", cache: "no-store", credentials: "omit",
      headers: { Accept: "application/vnd.github+json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(issuePayload(draft, files, urls, optional)),
    });
  } catch {
    throw new Error(`未收到 GitHub 的提交结果。请先在 ${ISSUES_URL} 检查是否已生成投稿，再决定是否重试。`);
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error("GitHub 授权已过期，请重新登录。已上传附件会保留。");
    throw new Error(`GitHub 未接受本次投稿（${response.status}），请检查账号投稿权限后重试。`);
  }
  const issue = await response.json();
  if (!Number.isInteger(issue.number) || !issue.html_url?.startsWith(`${ISSUES_URL}/`)) throw new Error("GitHub 已返回提交结果，请在仓库中检查投稿是否成功。");
  return issue;
}
