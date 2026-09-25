# Render 免费演示部署

无需购买服务器或域名。根目录 render.yaml 创建名为 carecall 的 Free Web Service，使用新加坡区域、codex/CareCall 分支，关闭自动部署以避免后续提交意外发布。

实际地址由 Render 分配，预计形式是 carecall-某后缀.onrender.com；不能在创建成功前声称某个地址已被占用或可用。Render 子域名不含 AI 工具名称。HTTPS 由平台提供，公网录音和定位需要 HTTPS。

## 上线步骤

1. 登录 https://dashboard.render.com/，可选择 GitHub 登录。
2. 先确认允许将本地修改推送到 codex/CareCall。仅创建 Render 服务无法读取本机尚未推送的修改。
3. 将所需代码及 render.yaml 发布到该分支，禁止上传 .env.local 或 API 密钥。
4. Render 中选择 New → Blueprint，连接包含本文件的仓库，选择 codex/CareCall 分支。
5. 检查服务名 carecall、实例 Free、区域 Singapore，不选择付费实例或数据库。若平台提示收费，先停止并确认。
6. 等待构建、部署和健康检查成功，再从 Render 复制真实网址。
7. 分别从香港及中国大陆网络访问，测试登录、定位、录音、接单、聊天、地图。

平台设置的 RENDER_EXTERNAL_URL 用于正确校验 HTTPS 来源及设置 Secure Cookie，不需要预先猜测最终域名。服务器监听 Render 提供的 PORT。

## 免费限制

- 15 分钟无入站流量后休眠，后续访问冷启动约一分钟。
- 当前项目使用内存存储，休眠、重启或重新部署会清除用户、请求和聊天。
- 免费额度及带宽/构建分钟限制以 Render 官方规则为准；不等于无限免费。
- 免费 Postgres 当前有 30 天有效期，不能当作长期免费数据库方案。
- Render 和外部地图/语音服务在大陆的访问需要实测，不能保证稳定直连。

这适合短期演示。若需要持久账户和请求，下一步应接入持久数据库及真实身份验证。

官方资料：https://render.com/docs/free 和 https://render.com/docs/blueprint-spec
