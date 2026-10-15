import test from "node:test";
import assert from "node:assert/strict";
import {
  CARD_LABELS, SUBMISSION_URL, LOGIN_URL, avatarFromMarkdown, issueToCard,
  fetchCharacterCards, filterAndSortCards,
} from "../src/chatroom/creator/github.mjs";

function issue(number, overrides = {}) {
  return {
    number,
    title: "[角色卡投稿] 芙提雅",
    state: "open",
    user: { login: "QingchenWait" },
    labels: [{ name: "初审通过" }],
    created_at: `2026-10-${String((number % 12) + 1).padStart(2, "0")}T08:00:00Z`,
    body: "### 角色卡名称\r\n\r\n**芙提雅**\r\n\r\n### 角色卡介绍\r\n\r\n来自《海姆休息室》的 [小老师](https://qingchenwait.github.io/Fritia_Online_CHAT_plugins/)\r\n\r\n### 头像\r\n\r\n[profile.png](https://github.com/user-attachments/assets/example)\r\n\r\n### 人格提示词\r\n\r\n[prompt.txt](https://github.com/user-attachments/files/prompt.txt)",
    ...overrides,
  };
}

test("reads the actual GitHub issue-form headings and regular image attachment links", () => {
  const card = issueToCard(issue(2));
  assert.equal(card.name, "芙提雅");
  assert.equal(card.description, "来自《海姆休息室》的 小老师");
  assert.equal(card.avatar, "https://github.com/user-attachments/assets/example");
  assert.equal(card.author, "QingchenWait");
  assert.equal(card.url, "https://github.com/QingchenWait/Fritia_Online_CHAT_plugins/issues/2");
});

test("supports Markdown and embedded HTML avatars while rejecting unsafe URLs", () => {
  assert.equal(avatarFromMarkdown('![头像](https://example.com/avatar.png "头像")'), "https://example.com/avatar.png");
  assert.equal(avatarFromMarkdown('<img width="100" src="https://example.com/a.webp" />'), "https://example.com/a.webp");
  assert.equal(avatarFromMarkdown('[avatar](javascript:alert(1))'), "");
  assert.equal(avatarFromMarkdown('![a](https://user:password@example.com/a.jpg)'), "");
  assert.equal(avatarFromMarkdown(""), "");
});

test("reads all API pages, deduplicates, filters closed issues and pull requests, and disables caching", async () => {
  const requests = [];
  const first = Array.from({ length: 100 }, (_, index) => issue(index + 1));
  const second = [issue(100), issue(101), issue(102, { state: "closed" }), issue(103, { pull_request: {} }), issue(104, { labels: [] })];
  const cards = await fetchCharacterCards(CARD_LABELS.all, {
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify(requests.length === 1 ? first : second), {
        status: 200,
        headers: requests.length === 1 ? { link: '<https://api.github.com/example?page=2>; rel="next"' } : {},
      });
    },
  });
  assert.equal(cards.length, 101);
  assert.equal(requests.length, 2);
  for (const [index, request] of requests.entries()) {
    assert.equal(request.url.searchParams.get("page"), String(index + 1));
    assert.equal(request.url.searchParams.get("labels"), "初审通过");
    assert.equal(request.url.searchParams.get("state"), "open");
    assert.ok(request.url.searchParams.has("_fresh"));
    assert.equal(request.options.cache, "no-store");
    assert.equal(request.options.credentials, "omit");
  }
});

test("featured cards require the featured label and preserve the request abort signal", async () => {
  const controller = new AbortController();
  const cards = await fetchCharacterCards(CARD_LABELS.featured, {
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      assert.equal(url.searchParams.get("labels"), "精选角色卡");
      assert.equal(options.signal, controller.signal);
      return new Response(JSON.stringify([issue(1), issue(2, { labels: ["精选角色卡"] })]));
    },
  });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].featured, true);
});

test("searches names, descriptions and GitHub IDs and sorts without mutating the source", () => {
  const cards = [issueToCard(issue(1)), issueToCard(issue(2)), issueToCard(issue(3))];
  assert.deepEqual(filterAndSortCards(cards, "  qingCHENwait ", "newest").map((card) => card.id), [3, 2, 1]);
  assert.deepEqual(filterAndSortCards(cards, "小老师", "oldest").map((card) => card.id), [1, 2, 3]);
  assert.equal(filterAndSortCards(cards, "不存在的角色", "newest").length, 0);
  assert.deepEqual(cards.map((card) => card.id), [1, 2, 3]);
});

test("provides actionable rate-limit and invalid-response errors", async () => {
  await assert.rejects(fetchCharacterCards("初审通过", {
    fetchImpl: async () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
  }), /访问频率已达上限/);
  await assert.rejects(fetchCharacterCards("初审通过", {
    fetchImpl: async () => new Response("{}", { status: 200 }),
  }), /无法识别的数据/);
});

test("submission and login both lead to the exact native template without restricted label query parameters", () => {
  assert.equal(SUBMISSION_URL, "https://github.com/QingchenWait/Fritia_Online_CHAT_plugins/issues/new?template=character-card.yml");
  const url = new URL(SUBMISSION_URL);
  assert.equal(url.searchParams.get("template"), "character-card.yml");
  assert.equal(url.searchParams.has("labels"), false);
  const returnTo = new URL(LOGIN_URL).searchParams.get("return_to");
  assert.equal(new URL(returnTo, "https://github.com").href, SUBMISSION_URL);
});
