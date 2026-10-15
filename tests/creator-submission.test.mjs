import test from "node:test";
import assert from "node:assert/strict";
import { issuePayload, submitCharacterCard, TITLE_PREFIX, validateFile, validateSubmission, verifyGitHubToken } from "../src/chatroom/creator/submission.mjs";

const draft = { title: "芙提雅", name: "芙提雅", description: "属于你的海姆达尔恋人", detail: "" };
const files = () => ({
  avatar: new File(["image content"], "avatar.png", { type: "image/png" }),
  prompt: new File(["角色设定".repeat(300)], "prompt.txt", { type: "text/plain" }),
  voice: new File(["audio content"], "voice.wav", { type: "audio/wav" }),
});
const required = [true, true, true];

test("requires each upload and each mandatory declaration while allowing an empty optional description", () => {
  assert.deepEqual(validateSubmission(draft, files(), required), {});
  for (let index = 0; index < 3; index++) {
    assert.ok(validateSubmission(draft, files(), required.map((value, i) => i === index ? false : value)).declarations);
  }
  for (const kind of ["avatar", "prompt", "voice"]) {
    assert.ok(validateSubmission(draft, { ...files(), [kind]: null }, required)[kind]);
  }
  assert.ok(validateSubmission({ ...draft, description: "字".repeat(61) }, files(), required).description);
  assert.ok(validateSubmission({ ...draft, detail: "字".repeat(1001) }, files(), required).detail);
  assert.equal(validateSubmission({ ...draft, description: "字".repeat(60) }, files(), required).description, undefined);
});

test("rejects unsupported file types, empty uploads, and files above their individual size limit", () => {
  assert.match(validateFile(new File(["x"], "avatar.svg"), "avatar"), /PNG/);
  assert.match(validateFile(new File([], "prompt.txt"), "prompt"), /为空/);
  assert.match(validateFile({ name: "voice.mp3", size: 21 * 1024 * 1024 }, "voice"), /20 MB/);
});

test("builds the native-template headings, image and file links, and exact optional authorizations", () => {
  const payload = issuePayload(draft, files(), { avatar: "https://files.example/avatar.png", prompt: "https://files.example/prompt.txt", voice: "https://files.example/voice.wav" }, [false, true]);
  assert.equal(payload.title, TITLE_PREFIX + draft.title);
  assert.match(payload.body, /### 详细描述\n\n_No response_/);
  assert.match(payload.body, /!\[avatar.png\]\(https:\/\/files.example\/avatar.png\)/);
  assert.equal((payload.body.match(/- \[x\]/g) || []).length, 4);
  assert.equal((payload.body.match(/- \[ \]/g) || []).length, 1);
  assert.deepEqual(payload.labels, ["角色卡"]);
  assert.throws(() => issuePayload(draft, files(), { avatar: "javascript:alert(1)", prompt: "https://files.example/prompt.txt", voice: "https://files.example/voice.wav" }), /HTTPS/);
});

test("never shows a validated identity for expired tokens or insufficient GitHub scopes", async () => {
  await assert.rejects(verifyGitHubToken("synthetic-test-token", async () => new Response("{}", { status: 401 })), /验证 GitHub 身份/);
  await assert.rejects(verifyGitHubToken("synthetic-test-token", async () => new Response(JSON.stringify({ login: "author", id: 42 }), { headers: { "x-oauth-scopes": "read:user" } })), /投稿权限/);
});

function integration({ tokenId = 42, failUpload, failPost = false } = {}) {
  const uploads = [];
  const posts = [];
  return {
    uploads, posts,
    client: { storage: { from: (bucket) => ({
      upload: async (path, file, options) => { uploads.push({ bucket, path, file, options }); return { error: path.includes(failUpload || "never-match") ? { message: "storage denied" } : null }; },
      getPublicUrl: (path) => ({ data: { publicUrl: `https://demo.supabase.co/storage/v1/object/public/character-card-attachments/${path}` } }),
    }) } },
    fetchImpl: async (url, options) => {
      if (url === "https://api.github.com/user") return new Response(JSON.stringify({ login: "author", id: tokenId }), { headers: { "x-oauth-scopes": "public_repo" } });
      posts.push({ url, options });
      if (failPost) throw new TypeError("network interrupted");
      return new Response(JSON.stringify({ number: 73, html_url: "https://github.com/QingchenWait/Fritia_Online_CHAT_plugins/issues/73" }), { status: 201 });
    },
  };
}

test("uploads all attachments to the signed-in user's namespace before creating an issue as that GitHub user", async () => {
  const services = integration();
  const issue = await submitCharacterCard({ ...services, bucket: "character-card-attachments", userId: "supabase-user-uuid", githubUserId: 42, token: "synthetic-test-token", draft, files: files(), required, optional: [false, false] });
  assert.equal(issue.number, 73);
  assert.equal(services.uploads.length, 3);
  for (const upload of services.uploads) {
    assert.ok(upload.path.startsWith("supabase-user-uuid/"));
    assert.equal(upload.options.upsert, false);
  }
  assert.equal(services.posts.length, 1);
  const post = services.posts[0];
  assert.equal(post.url, "https://api.github.com/repos/QingchenWait/Fritia_Online_CHAT_plugins/issues");
  assert.equal(post.options.headers.Authorization, "Bearer synthetic-test-token");
  assert.match(JSON.parse(post.options.body).body, /https:\/\/demo.supabase.co\/storage/);
});

test("does not upload or create an issue when the GitHub identity is mismatched or the prompt is too short", async () => {
  const services = integration({ tokenId: 99 });
  const parameters = { ...services, bucket: "character-card-attachments", userId: "uuid", githubUserId: 42, token: "synthetic-test-token", draft, files: files(), required };
  await assert.rejects(submitCharacterCard(parameters), /身份与当前登录账号不一致/);
  await assert.rejects(submitCharacterCard({ ...parameters, files: { ...files(), prompt: new File(["too short"], "prompt.txt") } }), /至少 1000 字/);
  assert.equal(services.uploads.length, 0);
  assert.equal(services.posts.length, 0);
});

test("does not publish incomplete attachments, and reports ambiguous POST failures without retrying", async () => {
  const base = { bucket: "character-card-attachments", userId: "uuid", githubUserId: 42, token: "synthetic-test-token", draft, files: files(), required };
  const failedUpload = integration({ failUpload: "prompt.txt" });
  await assert.rejects(submitCharacterCard({ ...base, ...failedUpload }), /人格提示词上传失败/);
  assert.equal(failedUpload.posts.length, 0);
  const failedPost = integration({ failPost: true });
  await assert.rejects(submitCharacterCard({ ...base, ...failedPost }), /先在.*检查是否已生成投稿/);
  assert.equal(failedPost.posts.length, 1);
});
