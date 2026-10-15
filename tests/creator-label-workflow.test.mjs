import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { issuePayload } from "../src/chatroom/creator/submission.mjs";

test("the actual issue-opened workflow labels a native-format submission without approving it", async () => {
  const workflow = await readFile(new URL("../.github/workflows/label-character-cards.yml", import.meta.url), "utf8");
  const script = workflow.replaceAll("\r\n", "\n").split("script: |\n")[1];
  assert.ok(script);
  const execute = new (Object.getPrototypeOf(async function () {}).constructor)("github", "context", script);
  const result = issuePayload({ title: "测试角色", name: "芙提雅", description: "社区创作", detail: "" }, { avatar: { name: "avatar.png" }, prompt: { name: "prompt.txt" }, voice: { name: "voice.mp3" } }, { avatar: "https://storage.example/avatar.png", prompt: "https://storage.example/prompt.txt", voice: "https://storage.example/voice.mp3" });
  const calls = [];
  const github = { rest: { issues: {
    createLabel: async (args) => { calls.push({ method: "createLabel", args }); },
    addLabels: async (args) => { calls.push({ method: "addLabels", args }); },
  } } };
  const context = { repo: { owner: "QingchenWait", repo: "Fritia_Online_CHAT_plugins" }, payload: { issue: { number: 27, ...result, labels: [] } } };
  await execute(github, context);
  assert.deepEqual(calls.find((call) => call.method === "addLabels").args.labels, ["角色卡"]);
  assert.equal(calls.some((call) => call.args.labels?.includes("初审通过")), false);
  calls.length = 0;
  await execute(github, { ...context, payload: { issue: { ...context.payload.issue, title: "其他问题" } } });
  assert.equal(calls.length, 0);
});
