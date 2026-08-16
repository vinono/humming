# 生产就绪指南

本指南汇集了将 `humming` 部署至生产环境时的运维关键项、环境拓扑、安全防线与最佳实践。

`humming` 追求极度克制与高吞吐。其核心目标并非取代企业级网关，而是作为前端应用与后端微服务之间可靠、透明且轻量的 BFF（Backend For Frontend）中间层。

---

## 推荐生产部署拓扑

在生产架构中，`humming` 推荐部署于入口反向代理（如 Nginx、Kubernetes Ingress、Cloudflare）与后端微服务集群之间：

```text
客户端浏览器 / App
       │
       ▼
入口负载均衡 / Ingress (TLS 卸载、WAF 防护、静态资源 CDN)
       │
       ▼
humming BFF 实例集群 (容器化水平扩缩容)
  ├── 承载前端聚合路由与页面级 API
  ├── 聚合分发前端数据字典 (/api/options)
  ├── 组装鉴权 Token / Session 转换
  └── 透明流式代理转发至后端服务
       │
       ▼
后端微服务集群 (Go / Java / Node.js 核心 RPC 与数据库)
```

---

## 核心生产环境变量

| 变量名 | 默认值 | 说明与生产建议 |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP 服务监听端口 |
| `LOG_LEVEL` | `info` | 日志级别（生产环境推荐 `info` 或 `warn`） |
| `FORWARD_ENABLED` | `true` | 是否开启反向代理转发终端 |
| `FORWARD_TIMEOUT_MS` | `10000` | 转发上游请求的默认超时时间（毫秒） |
| `FORWARD_BLOCK_PRIVATE_IP`| `true` | **安全防线**：默认阻止代理请求访问内网私有 IP（防 SSRF） |
| `FORWARD_FALLBACK_TARGET` | `""` | 未命中任何前缀规则时的默认上游基准地址 |
| `FORWARD_RULES` | `[]` | JSON 格式的路由前缀映射清单 |
| `FORWARD_TRANSPORT` | `fetch`| 默认底层传输策略（可选 `fetch` / `keepalive-fetch` / `retry-fetch`） |

> [!TIP]
> 建议在进程启动的最早阶段调用 `parseEnv()`，一旦环境变量格式不合法或缺失必填项，立即在启动阶段快速失败（Fail-Fast），防止带病上线。

---

## 真实客户端 IP 与反向代理协同

当 `humming` 部署在 Nginx、Caddy 或云厂商 ALB 之后时，请确保前置代理正确传递了以下标准请求头：
- `X-Forwarded-For`
- `X-Real-IP`
- `X-Forwarded-Proto`（标识原始客户端是 `http` 还是 `https`）
- `CF-Connecting-IP`（如经由 Cloudflare 代理）

`humming` 内建的限流插件（Rate Limit）与审计日志会依次提取上述请求头作为客户端标识。若您的环境使用了自定义的 IP 标头，可直接在限流插件中传入自定义 `key()` 生成函数。

---

## 生产级鉴权与权限设计 (Auth)

1. **窄化公开接口**：显式声明无需鉴权的白名单路径（如 `/health`、`/login`），其余所有路径默认纳入守卫。
2. **零信任客户端 Role 标头**：严禁直接采信前端传来的 `X-User-Role`。所有角色与权限均应在 BFF 层的 JWT 解析插件中从受签名保护的 Payload 里提取。
3. **敏感信息过滤**：使用插件中的 `afterResponse` 钩子或局部路由中间件，清洗上游微服务返回的敏感内部字段（如密码哈希、内部堆栈）。

---

## 缓存与限流的生产选型 (Cache & Rate Limiting)

- **内存存储模式（In-Memory）**：仅适用于单实例部署或本地开发联调。
- **分布式 Redis 模式（Redis Store）**：在多实例容器化部署（如 Kubernetes 多 Pod）下，务必启用 `createRedisCacheStore()` 与 `createRedisRateLimitStore()`，以保证缓存命中率与限流计数的全局一致性。

```ts
import { createRedisRateLimitStore, createRateLimitPlugin } from 'humming';

const rateLimiter = createRateLimitPlugin({
  store: createRedisRateLimitStore({
    client: redisClient,
    prefix: 'humming:rl:'
  }),
  limit: 100,
  windowMs: 60 * 1000
});
```

---

## 可观测性与日志监控 (Observability)

- **结构化 JSON 日志**：`humming` 默认输出符合工业标准的 JSON 日志，天然契合 Loki、ELK、Datadog 等日志采集引擎。
- **Prometheus 指标探针**：挂载官方 `@humming/plugin-metrics` 插件，自动暴露标准 `/metrics` 端点，采集请求吞吐（QPS）、P99 延迟分布与上游转发状态码。
- **全链路追踪 Request ID**：每个请求入口均自动分配或透传 `X-Request-Id`，并在所有转发日志与错误堆栈中全程打标。
