# 传输层与转发机制

本指南深入剖析 `humming` 代理转发（`forward`）背后的传输层架构与执行逻辑。

传输层设计的核心目标在于：在保持转发内核轻量的前提下，赋予工程团队对上游请求执行行为的**精细化控制权**（如连接复用策略、自适应重试机制、超时控制与异常分类）。

---

## 分层心智模型

`humming` 的转发管道划分为清晰的两大分层：

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. 路由匹配与请求整形层 (Rule Matching & Request Shaping)      │
│    - 决定命中哪条前缀规则                                      │
│    - 构建上游目标 URL 与路径重写                                │
│    - 筛选/追加 Forward 请求头与 Trace 链路 ID                 │
│    - 执行 beforeMatch / beforeRequest / afterResponse 钩子   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 传输层执行器 (Transport Execution Layer)                  │
│    - 发起底层网络请求 (fetch / KeepAlive)                     │
│    - 判断异常是否属于瞬态故障 (Transient Error)                │
│    - 计算退避重试延迟与最大重试次数                            │
│    - 处理流式响应 (Chunked Stream) 与大文件透传               │
└─────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> 职责划分原则：**路径重写与参数整形属于“转发规则层”；超时、连接复用与重试退避属于“传输层策略”。**

---

## 内建传输策略 (Built-in Transports)

`humming` 内建支持三种命名传输策略：

### 1. `fetch` (默认基础策略)
- **定位**：最纯粹、最透明的底层基准传输。
- **行为**：发起单次请求，不包含自动重试逻辑。
- **适用场景**：绝大多数标准内部 API 调用，以及本地调试。

### 2. `keepalive-fetch` (持久连接复用策略)
- **定位**：显式开启底层 HTTP Keep-Alive 连接池复用。
- **行为**：在请求元数据与底层网络通道中标记持久连接，降低高频微服务调用的 TCP/TLS 握手开销。
- **适用场景**：高频交互的固定内网微服务集群。

### 3. `retry-fetch` (智能重试策略)
- **定位**：专为幂等操作与网络不稳定上游设计的容错策略。
- **行为**：当遇到可重试的瞬态错误（如网络中断、DNS 偶发超时、502/503/504 错误）且请求体可重放时，按指数退避算法自动发起重试。
- **适用场景**：`GET` 查询、幂等只读数据接口。

> [!WARNING]
> 请勿盲目对所有路由启用 `retry-fetch`。对于非幂等写操作（如订单支付、数据扣减）、或者只读流式 Request Body，严禁自动重试以防重复提交副作用。

---

## 路由级与全局策略配置

您可以在全局环境变量中设定默认策略，也可以在单个路由规则中独立覆盖：

```ts
import { createApp } from 'humming';

const app = createApp({
  forward: {
    enabled: true,
    defaultTransport: 'fetch', // 全局默认传输策略
    rules: [
      {
        prefix: '/api/read-heavy',
        target: 'https://read-cluster.internal',
        transportStrategy: 'retry-fetch', // 局部覆盖为智能重试
        retry: {
          maxAttempts: 3,
          delayMs: 150,
          backoff: 'exponential'
        }
      },
      {
        prefix: '/api/order-pay',
        target: 'https://pay.internal',
        transportStrategy: 'fetch' // 支付接口严格保持单次提交
      }
    ]
  }
});
```

---

## 转发生命周期钩子 (Forward Lifecycle Hooks)

插件可以通过 `services.forwardProxy` 注册 4 类生命周期钩子：

```ts
context.services.forwardProxy.registerHook({
  // 1. 规则匹配前（可动态修改目标或重定向）
  beforeMatch(req) {
    // 例如根据灰度 Cookie 动态调整路由策略
  },

  // 2. 发起上游请求前（可注入动态签名、OAuth Token 等）
  beforeRequest(upstreamReq, ctx) {
    upstreamReq.headers.set('X-Service-Auth', generateToken());
  },

  // 3. 上游响应返回后（可检查业务错误码、过滤敏感字段）
  afterResponse(upstreamRes, ctx) {
    // 观察响应状态与耗时
  },

  // 4. 发生网络故障或异常时（可降级托底或告警上报）
  onError(error, ctx) {
    ctx.logger.error({ err: error }, 'Forward pipeline error encountered');
  }
});
```

---

## 安全与防护基线

- **默认阻断私有 IP 与 Localhost**：防止 SSRF 漏洞攻击（若本地联调需显式配置 `FORWARD_BLOCK_PRIVATE_IP=false`）。
- **完整流式响应支持**：针对 `text/event-stream`（SSE）与大文件下载，自动以 Chunked Stream 模式管道透传，不占用 Node/Bun 堆内存。
