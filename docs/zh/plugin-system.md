# 插件系统架构

插件系统是 `humming` 在保持内核极简的同时实现功能无限延展的核心基石。

如果将内核比作精简纯粹的操作系统微内核，那么插件就是承载绝大部分实际业务特性的核心载体。

> [!TIP]
> 如需直接查阅代码级编写细节与实战示例，请参阅 [插件开发实战教程](../PLUGIN_GUIDE.md)。

---

## 为什么需要插件化？

`humming` 严格限制了内核职责范围：
- 探针检查（`health`）
- 字典聚合（`options`）
- 代理转发（`forward`）
- 运行时基础共享上下文

这意味着所有非核心功能（如 **JWT 鉴权**、**Redis 缓存**、**Prometheus 指标**、**请求限流**、**访问日志** 以及 **业务私有路由**）都不应硬编码进入内核，而是作为标准插件灵活插入。

---

## 插件的形态定义

插件是通过 `definePlugin()` 创建的纯 TypeScript 对象：

```ts
import { definePlugin } from 'humming';

export const myPlugin = definePlugin({
  name: 'my-plugin',
  meta: {
    priority: 100,
    mode: 'all',
  },
  setup(context) {
    // 挂载中间件、声明路由、注册数据源或配置转发钩子
  },
});
```

插件契约极其精炼：
- **`name`**：插件唯一标识名，用于运行时治理、依赖拓扑与结构化日志输出。
- **`meta`**（可选）：元数据描述，包含执行优先级、运行环境模式、依赖与冲突声明。
- **`setup(context)`**：装配逻辑入口，在应用启动时执行。

---

## 插件能力矩阵

在 `setup(context)` 函数内部，插件可以执行以下操作：

- **挂载业务路由**：调用 `context.route(path, subApp)` 挂载子路由模块。
- **注册全局或局部中间件**：调用 `context.use(path, middleware)` 拦截请求与响应。
- **扩展字典数据源**：调用 `context.services.options.registerSource()` 注入自定义字典提供者。
- **拦截与增强转发请求**：调用 `context.services.forwardProxy.registerHook()` 注入生命周期钩子（`beforeMatch`、`beforeRequest`、`afterResponse`、`onError`）。
- **读取环境与日志**：访问强类型校验后的 `context.env` 与结构化 `context.logger`。
- **注册逆序清理逻辑**：调用 `context.onDispose(cleanupFn)` 或直接从 `setup()` 返回清理函数。

---

## 插件治理元数据 (Governance Metadata)

为了防止插件之间产生隐式竞态与冲突，`humming` 提供了轻量但严谨的治理元数据机制：

```ts
definePlugin({
  name: 'auth-jwt',
  meta: {
    priority: 200,                    // 优先级（数值越大越先执行）
    mode: ['production', 'development'], // 生效环境
    debugLabel: 'jwt-auth-guard',     // 调试与排错可读标签
    dependencies: ['request-logger'], // 强依赖插件列表
    conflicts: ['auth-session'],      // 互斥插件列表
  },
  setup(context) {
    // ...
  }
});
```

### 治理规则说明：
1. **`priority` 排序机制**：在执行 `setup()` 前，内核根据数值从大到小对插件排序，确保前置依赖（如日志注入、链路追踪）先于业务逻辑装配。
2. **`mode` 环境隔离**：支持 `development`、`test`、`production` 或 `all`，确保 Mock 插件与联调工具不会意外打包进生产环境。
3. **`dependencies` 依赖校验**：启动阶段自动检查依赖拓扑，若前置插件未启用则立即抛出可读异常，杜绝运行时空指针。
4. **`conflicts` 互斥保护**：防止团队成员同时启用功能重叠的插件（例如同时挂载两个不同的认证中间件）。
5. **重名冲突拦截**：内核在初始化阶段直接阻止同名插件的重复注册。

---

## 启动时序与运行时可视化

在应用启动时，`humming` 会在控制台打印两级透明的可视化视图：

1. **`plugins resolved`**：展示哪些插件被激活、哪些因环境或依赖被跳过。
2. **`plugin setup observed`**：详细统计每个插件注册的中间件路径、路由清单、字典源与转发钩子数量。

在转发日志中，每条请求均会记录 **`hookOwners`**，让开发者一目了然当前请求被哪些插件的钩子处理过，彻底告别“黑盒中间件”排错噩梦。

---

## 最佳实践指南

### 1. 保持单一职责 (Single Purpose)
一个好的插件通常只聚焦一个核心切面，例如：
- `auth-plugin`：专职用户凭证解析
- `rate-limit-plugin`：专职请求频次限制
- `tenant-route-plugin`：专职租户级业务聚合接口

### 2. 显式配置优于隐式全局变量
插件应当通过构造工厂函数接受外部配置项：
```ts
export function createCustomAuthPlugin(options: AuthOptions) {
  return definePlugin({
    name: 'custom-auth',
    setup(context) {
      // 使用 options 配置具体逻辑
    }
  });
}
```

### 3. 妥善注册资源释放钩子 (Safe Disposal)
若插件内部创建了定时器（`setInterval`）、持久网络连接（Redis/Kafka）或外部长连接，务必注册清理函数：
```ts
setup({ onDispose, logger }) {
  const timer = setInterval(syncTask, 5000);
  onDispose(() => {
    clearInterval(timer);
    logger.info('Timer disposed cleanly');
  });
}
```
