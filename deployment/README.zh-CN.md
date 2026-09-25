# CareCall 公网部署

当前状态：部署文件已准备，尚未绑定云服务器或域名，尚未发布公网网址。

## 所需资源

- 一台可运行 Docker Compose 的 Linux 服务器，例如香港区域。具体服务商、线路、费用需由账户持有人选择；香港节点不能保证所有大陆网络的可达性。
- 自己控制 DNS 的域名，名称含 carecall。也可以在已有域名下使用 carecall 子域名。本文不声称任何示例域名可注册。
- 为域名添加指向服务器的 A 记录；只有配置好 IPv6 时才添加 AAAA。
- 开放 TCP 80 和 443；应用的 3000 端口不向公网开放。

## 部署

将此项目复制到服务器，排除 .git、node_modules、.next、.env.local 和任何密钥文件。无需推送 GitHub。

在项目根目录执行：

```sh
cp deployment/.env.example deployment/.env
# 编辑 deployment/.env，填写 CARECALL_DOMAIN 和 ACME_EMAIL
docker compose --env-file deployment/.env -f deployment/compose.yaml up -d --build
docker compose --env-file deployment/.env -f deployment/compose.yaml ps
```

Caddy 自动申请 HTTPS 证书并将 HTTP 跳转到 HTTPS。麦克风和定位需要安全上下文，不能用普通公网 HTTP 完整替代。域名解析、80/443 放行以及证书签发必须成功。

Compose 明确关闭本机的测试电话替代设置，不会把测试号码公开部署。API 密钥不会从本机 .env.local 自动上传。需要 AI 服务时再在服务器配置对应密钥和用户同意流程。

CARECALL_PUBLIC_ORIGIN 被设置成正式 HTTPS 域名，用来校验写请求来源以及正确设置 Secure 会话 Cookie；应用端口必须只允许反向代理访问。

## 香港和大陆验证

域名上线后，从香港及至少一个大陆网络分别检查：

1. HTTP 跳转 HTTPS，证书有效，网址含 carecall 且不含 AI 工具名称。
2. 页面、语言切换、居民/义工登录、接受请求、双方聊天。
3. 定位、录音和照片上传权限。
4. OpenStreetMap 瓦片及 OSRM 路线的实际加载；这些外部服务并不保证大陆可用。若不稳定，须另选具备授权和当地覆盖的地图/路线服务，或配置自托管服务。
5. 浏览器语音识别和可选 AI 服务的可达性；网站主体可打开不代表这些第三方服务均可用。

Next.js 字体在构建时下载并随网站提供，访客不需要连接 Google Fonts；构建环境仍需要能够取得字体。

## 当前数据限制

此配置是现有演示版的单进程部署：无持久数据库、无电话所有权验证。重启、更新镜像或进程崩溃会清除账户、请求和聊天。不要启动多个 app 副本，否则其内存数据互不共享。

正式面向公众长期使用前，需要数据库、可靠登录验证和数据保留策略。当前部署包没有伪装成已完成这些功能。

## 本机验证状态

构建、反向代理来源校验及 Cookie 行为可以在本机验证；真实 DNS、证书、香港/大陆线路必须在获得服务器与域名后验证。
