# 插件开发实战指南

`humming` 坚持精炼的内核设计，倡导将绝大部分业务逻辑与运维切面封装在独立插件中。

本指南提供代码级的插件编写范式、生命周期管理以及真实案例。

---

## 什么时候应该编写插件？

当您需要为应用引入以下能力时，应当使用插件封装：

- **挂载业务路由**（如 `/api/user/profile`、`/api/order/summary`）
- **注册拦截中间件**（如 Header 校验、请求审计）
- **扩展字典数据源**（如从远程微服务或配置中心拉取枚举）
- **代理转发前后置钩子**（如注入 OAuth 签名、清洗响应数据）
- **通用运维切面**（如 JWT 鉴权、Redis 缓存、Prometheus 指标、CORS）

> [!NOTE]
> `health` 健康检查、基础请求上下文分发、核心 `options` 管道与底层 `forward` 代理终端始终由内核固化，无需重复实现。

---

## 插件标准声明范式

使用 `definePlugin()` 工厂函数声明插件：

```ts
import { definePlugin } from 'humming';

export const myPlugin = definePlugin({
  name: 'my-plugin',
  meta: {
    priority: 100,                     // 优先级数值，越大越早执行
    mode: 'development',               // 生效环境：'development' | 'production' | 'test' | 'all'
    debugLabel: 'custom-logger',       // 控制台日志可读标签
    dependencies: ['request-logger'],  // 前置依赖插件
    conflicts: ['legacy-logger'],      // 互斥插件
  },
  setup(context) {
    // 挂载路由、中间件或注册钩子
  },
});
```

---

## 插件上下文对象 (Plugin Context)

内核在调用 `setup(context)` 时会传入标准上下文对象：

- **`app`**：底层 Hono 实例对象
- **`env`**：经过严格类型校验的环境变量对象
- **`logger`**：工业级结构化日志器（Pino）
- **`services.options`**：前端字典注册表接口
- **`services.forwardProxy`**：代理转发钩子注册接口
- **`services.localDebugRuntime`**：多环境联调状态共享中心
- **`use(path, middleware)`**：快速注册中间件
- **`route(path, subApp)`**：快速挂载子路由
- **`onDispose(handler)`**：注册进程退出或热重载清理逻辑

---

## 实战案例 1：业务子路由插件

```ts
import { definePlugin } from 'humming';
import { Hono } from 'hono';

export const userRoutePlugin = definePlugin({
  name: 'user-routes',
  setup({ route }) {
    const userApp = new Hono();

    userApp.get('/profile', (c) => {
      return c.json({
        id: 'u_1001',
        name: 'Alex',
        role: 'engineer',
      });
    });

    // 挂载至 /api/users 前缀
    route('/api/users', userApp);
  },
});
```

---

## 实战案例 2：转发安全签名钩子插件

```ts
import { definePlugin } from 'humming';

export const upstreamSignPlugin = definePlugin({
  name: 'upstream-signature',
  setup({ services, logger }) {
    services.forwardProxy.registerHook({
      beforeRequest(upstreamReq, ctx) {
        const timestamp = Date.now().toString();
        upstreamReq.headers.set('X-Signature-Timestamp', timestamp);
        upstreamReq.headers.set('X-Service-Client', 'humming-bff');
        logger.debug({ path: upstreamReq.url }, 'Signature injected into forward request');
      },
      afterResponse(upstreamRes, ctx) {
        // 剥离上游返回的敏感内部标头
        upstreamRes.headers.delete('x-internal-runtime');
      }
    });
  },
});
```

---

## 实战案例 3：带资源释放与定时同步的插件

```ts
import { definePlugin } from 'humming';

export const cacheWarmupPlugin = definePlugin({
  name: 'cache-warmup',
  setup({ logger, onDispose }) {
    const timer = setInterval(() => {
      logger.info('Performing periodic dictionary warmup...');
    }, 60_000);

    // 进程退出或主动销毁时执行清理
    onDispose(() => {
      clearInterval(timer);
      logger.info('Cache warmup timer cleanly cleared');
    });
  },
});
```

---

## 插件组装与启动

在项目入口文件中显式传入插件数组：

```ts
import { createApp } from 'humming';
import { userRoutePlugin } from './plugins/user-routes';
import { upstreamSignPlugin } from './plugins/upstream-sign';

const app = createApp({
  plugins: [
    userRoutePlugin,
    upstreamSignPlugin,
  ],
});

export default app;
```
