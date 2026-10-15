# 开通站内 GitHub 投稿

需要你创建一个 Supabase 项目并注册一个 GitHub OAuth App。站点本身继续发布在 GitHub Pages；不用部署 Worker 或自建服务器。附件将托管在 Supabase 的公开桶，Issue 发布到 `QingchenWait/Fritia_Online_CHAT_plugins`，作者为登录投稿者。

## 1. GitHub OAuth 登录

在 [Supabase](https://supabase.com/) 创建项目，打开 **Authentication → Sign In / Providers → GitHub**，复制该项目的回调 URL，格式为 `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`。

在 GitHub **Settings → Developer settings → OAuth Apps → New OAuth App** 注册：

- Application name：海姆休息室共创计划。
- Homepage URL：`https://qingchenwait.github.io/Fritia_Online_CHAT_plugins/`。
- Authorization callback URL：上面的 **Supabase 回调 URL**。

把 GitHub Client ID / Client Secret 填入 **Supabase 的 GitHub provider 控制台**并启用。不要把 Client Secret 写入代码、`.env` 或 GitHub Pages 构建变量。

Supabase **Authentication → URL Configuration**：

- Site URL：`https://qingchenwait.github.io/Fritia_Online_CHAT_plugins/`
- Redirect URLs 添加：`https://qingchenwait.github.io/Fritia_Online_CHAT_plugins/?view=submit`
- 本地测试时再添加：`http://127.0.0.1:5173/?view=submit`。换端口需要增加对应地址。

网页登录请求 `public_repo` scope，它是 GitHub OAuth 为公开仓库提供的读写权限，**并非只限本仓库的细粒度授权**。GitHub 同意页会展示该权限，用户可在 Authorized OAuth Apps 中撤销。使用此 scope 是为了让 Issue 保留投稿者的 GitHub 作者归属。

## 2. 附件存储

在 Supabase **SQL Editor** 运行 [setup.sql](supabase/setup.sql)。它创建 `character-card-attachments` 公开 bucket，并只允许通过 GitHub 登录的用户向自己的 UUID 目录新增文件。

- 接受 PNG/JPEG/WEBP、TXT、MP3/WAV，bucket 的服务器单文件硬限制为 20 MB。
- 网页进一步限制头像 5 MB、提示词 1 MB、语音 20 MB，提示词至少 1000 字且为 UTF-8 TXT。
- 没有客户端 UPDATE/DELETE policy，避免发帖后附件被修改或链接失效。管理员仍可清理违规或孤立附件。
- 网络中断时不自动删除上传文件，因为 Issue 可能实际已创建，只是浏览器没有收到结果。

公开附件将被写入 GitHub Issue 正文，请确认 APP 能下载普通 HTTPS 附件链接。如 APP 对 `github.com/user-attachments` 有硬编码或域名白名单，需增加对应的 Supabase Storage 域名。

公开社区仍需根据实际用量配置认证限流、存储预算和人工审核。本配置不会给每个用户提供严格的磁盘配额；所有格式内容也仍需审核。免费额度、项目停用与价格以提供商当前规则为准。

## 3. 网页公开配置

在 Supabase **Connect / API Keys** 获取项目 URL 和 **publishable key**；旧项目的 `anon` key 也可用。

本地复制 `.env.example` 为 `.env.local`，填入：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
VITE_SUPABASE_BUCKET=character-card-attachments
```

线上在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 建立同名 repository variables，然后重新运行 Pages workflow。

`VITE_*` 会进入公开网页。**不得填入 service_role key、Supabase secret key、GitHub client secret、PAT 或 App 私钥。** 浏览器使用 Supabase 用户 JWT 加 RLS 控制上传，GitHub 令牌只属于当前投稿者；会话和 provider token 只保存在当前标签页的 sessionStorage，退出后清除。

## 4. 自动标签

把 [label-character-cards.yml](.github/workflows/label-character-cards.yml) 一并提交到目标仓库。GitHub 普通投稿者没有设置标签的权限，因此 API 创建时可能忽略 `labels` 参数。该工作流在 Issue 打开后检查标题和表单字段，补上 `角色卡`；**不会添加“初审通过”或“精选角色卡”**。

运行它需要仓库允许 GitHub Actions 使用 workflow 中声明的 `issues: write` 权限。Issue 可能先显示为未标记，然后在工作流执行后出现投稿标签。

## 5. 首次真实联调

由于目前没有实际 Supabase 项目，本地只有模拟接口测试，尚未验证云端 OAuth、SQL 策略部署或真实发帖。开通后用普通账号进行一次测试：

1. 打开 Pages 主页，进入投稿。未登录只显示 GitHub 登录按钮。
2. 授权后核对显示的 `@GitHub用户名`。
3. 填写标题、名称、60 字符介绍；详情选填。选取三种附件，勾选三项必选声明。
4. 取消任意必选声明时提交按钮应禁用，补齐后才可提交。
5. 提交后检查 Issue 作者是该普通账号、正文包含三个 HTTPS 附件地址、`角色卡` 标签由 workflow 添加。
6. 在未登录浏览器中打开三个附件地址；在 APP 中试下载这张卡。
7. 未加审核标签时总览不显示。管理员审核后加上 `初审通过` 并刷新总览。

未开通配置时原生 GitHub 模板保持可用。开通后网页会自动启用站内投稿，不需要再改组件代码。
