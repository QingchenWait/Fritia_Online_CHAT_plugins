# 海姆休息室共创计划

独立 React / Vite 静态站点，主页即共创计划。目标仓库为 [QingchenWait/Fritia_Online_CHAT_plugins](https://github.com/QingchenWait/Fritia_Online_CHAT_plugins)，GitHub Pages 默认网址为 **https://qingchenwait.github.io/Fritia_Online_CHAT_plugins/**。原 Cloudflare 项目未修改。

## 启动与部署

建议使用 Node.js 24。

```bash
npm ci
npm test
npm run dev
```

生产构建为 `npm run build`，产物在 `dist/`。相对资源和分类锚点兼容 GitHub Pages 仓库子目录。

将本项目文件合并到目标仓库根目录（保留该仓库其他已有文件），在 **Settings → Pages → Source** 选择 **GitHub Actions**。推送到 `main` 或手动运行 [pages.yml](.github/workflows/pages.yml) 即构建、测试并部署。本轮仅准备本地项目，没有推送、创建 Supabase 项目或发布网站。

## 站内投稿

已经实现 **Supabase Auth + Supabase Storage + GitHub API** 的可配置方案。网站仍部署在 Pages，无需自建服务器；第三方托管认证和附件存储。

1. Supabase 代办 GitHub OAuth。网页用返回的 provider token 调用 `/user` 核实投稿者真实身份，并与 Supabase 的 GitHub identity 比对。
2. 登录验证成功后显示表单，头像、TXT 提示词及 MP3/WAV 保存到 Supabase 公开附件桶，按用户 UUID 分隔。
3. 网页使用投稿者的 GitHub 令牌创建 Issue，作者是投稿者本人，正文与 `character-card.yml` 字段标题一致。
4. 普通投稿者无权直接添加标签时，由仓库内的 [label-character-cards.yml](.github/workflows/label-character-cards.yml) 工作流补上 `角色卡`，不会自动添加审核通过或精选标签。

**开通步骤见 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)**，访问规则在 [supabase/setup.sql](supabase/setup.sql)。Pages 构建通过 repository variables 读取公开配置。不得向前端填入 service_role/secret key、GitHub client secret、PAT 或 App 私钥。

尚未创建真实 Supabase 项目，因此真实 OAuth、Storage RLS 和云端 Issue 写入尚待开通后联调。本地测试使用模拟服务验证身份拒绝、上传顺序、表单校验、正文格式及失败处理，不会创建真实 Issue。未配置时保留可用的 [character-card.yml 原生入口](https://github.com/QingchenWait/Fritia_Online_CHAT_plugins/issues/new?template=character-card.yml)，完整配置后自动启用站内表单。

## 浏览与免责声明

- 默认显示介绍，右侧强调色“浏览角色卡”进入总览。
- 总览读取 open 且有 `初审通过` 标签的 Issue，精选读取 open 且有 `精选角色卡` 标签的 Issue。包含搜索、排序、分页、刷新和环形加载动画。
- Issue 请求使用 `cache: no-store`，列表不写入浏览器存储。
- 进入总览或精选后立即开始读取，同时只模糊角色卡区域并展示免责声明；“我已知悉”解除遮罩，“不再提醒”单独保存在 localStorage。
- Markdown 支持 GFM、HTML、公式、表格、代码高亮及本地图片；HTML 仅用于受信任本地文档，不直接渲染用户 Issue 的 HTML。

## 检索结论与来源

组合托管服务可以满足站内投稿，因此本站没有把跳转 GitHub 固定为唯一方案。迁移到 Pages 本身不会改变浏览器对 `github.com` 登录状态和令牌端点的访问限制，托管 OAuth 负责解决这一部分。

- [Supabase GitHub 登录](https://supabase.com/docs/guides/auth/social-login/auth-github)：OAuth、额外 scope、provider token。
- [浏览器上传](https://supabase.com/docs/guides/storage/uploads/standard-uploads)、[Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)：公开文件、认证上传和用户目录规则。
- [GitHub API CORS](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)、[创建 Issue](https://docs.github.com/en/rest/issues/issues#create-an-issue)：授权写入及标签权限。
- [BugDrop 源码](https://github.com/bugdrophq/bugdrop)：有网页到 Issue 的托管路径，但使用 App 身份建单，不保留投稿者归属，未采用。

视觉参考 [AstrBot 市场页](https://cloud.astrbot.app/market) HTML 和公开 CSS 的约 210px 侧栏、双列卡片及搜索分页布局，使用独立 React 实现。新按钮图标下载自 [Lucide](https://github.com/lucide-icons/lucide)，许可在 `src/chatroom/creator/icons/LICENSE`；GitHub 标识为 Simple Icons 的 CC0 素材。
