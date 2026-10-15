# 共创页面模块

独立站首页为项目根目录 index.html。完整开通流程见项目根目录 README.md 和 SUPABASE_SETUP.md。

- CreatorApp.jsx：分类导航、实时角色卡浏览、原生模板后备入口、区域模糊免责声明。
- auth.jsx：Supabase GitHub PKCE 登录、当前标签页会话和 GitHub /user 身份验证。
- SubmissionForm.jsx：登录门禁、拖拽文件上传器、60 字符介绍、可选详情和声明。
- submission.mjs：文件及正文校验、公开附件上传和使用投稿者账号创建 Issue。
- github.mjs：新仓库与 Pages URL、标签、全部 API 页读取、头像解析及搜索排序。
- MarkdownDocument.jsx：GFM、HTML、公式、高亮及相对资源，仅用于受信任的本地文档。
- intro.md / guide.md：编辑后重新构建；目录内本地图片由 Vite 打包。

总览标签为“初审通过”，精选标签为“精选角色卡”。角色卡列表不持久化缓存；localStorage 只记住免责声明确认，登录使用单独 sessionStorage。

无 Supabase 配置时进入仓库的 character-card.yml 原生模板，配置后启用完整站内表单。不需要复制原 Cloudflare 页面的其他聊天 APP 素材。
