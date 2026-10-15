# 共创页面模块

独立站入口为根目录 index.html，部署说明见根目录 README.md。

- CreatorApp.jsx：导航、实时角色卡浏览、GitHub 原生模板入口、区域模糊免责声明。
- github.mjs：新仓库及 Pages URL、标签、分页读取、头像解析、搜索排序。
- MarkdownDocument.jsx：GFM、HTML、公式、高亮及相对资源，仅用于受信任本地文档。
- intro.md / guide.md：修改后重新构建；目录内本地图片由 Vite 打包。

投稿始终打开仓库 character-card.yml 原生模板。GitHub 负责登录、表单验证、原生附件上传和提交，不使用 Supabase 授权或第三方附件存储。

总览标签为“初审通过”，精选标签为“精选角色卡”。角色卡列表不缓存；localStorage 仅保存免责声明“不再提醒”的偏好。
