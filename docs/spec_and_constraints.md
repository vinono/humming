# humming 技术规格与架构约束规范 (Spec & Constraints)

本规范定义了 `humming` 项目的技术规格及开发约束。旨在维持核心代码库的轻量与高可追溯性，并确保插件开发与系统拓展的规范。

---

## 一、 技术规格说明书 (Specification - Spec)

### 1. 系统定位与核心边界 (System Positioning & Boundaries)
* **定位**：`humming` 是一款基于 Bun 运行时的、插件优先的轻量级 BFF（Backend For Frontend）内核。它专为前端及小规模平台团队设计，充当薄薄的边缘后端服务层，而非重型 Web 框架或平台级 API 网关（如 Kong、Envoy）。
* **功能边界**：核心层严格仅且提供三项内置路由/服务：
  * `health`：应用存活检测。
  * `options`：跨服务运行时动态参数与选项字典服务。
  * `forward`：反向代理与请求转发终端。
* 所有其他运维或业务功能（例如 Auth、缓存、限流、跨域处理）一律通过插件系统引入，不得污染核心层。

### 2. 核心内置模块规格 (Built-in Modules Spec)
* **Health 模块 (`GET /health`)**：
  * 返回格式：`{ result: true, data: { status: "UP" } }`，状态码 `200`。
  * 当依赖服务异常时，可返回状态码 `503`。
* **Options 模块 (`GET /api/options` & `POST /api/options`)**：
  * 提供配置获取与配置写入接口。数据通过在 Options 注册的 Source 执行获取与同步。
  * 支持输入有效性校验，校验失败时返回 `400`（带 `VALIDATION_ERROR` 错误码）。
* **Forward 模块（反向代理）**：
  * 全局拦截未被内置路由或插件路由匹配的所有路径并尝试向上游（Upstream）转发。
  * 提供 `beforeMatch`、`beforeRequest`、`afterResponse`、`onError` 转发钩子。
  * 必须天然支持 Stream 块级流式传输、Multipart 多部分表单，以及大文件流式转发。

### 3. 插件系统规格 (Plugin System Spec)
* **定义格式**：所有插件必须通过 `definePlugin` 函数显式定义，声明其 `name` 标识、治理属性 `meta` 以及 `setup` 方法：
  ```ts
  import { definePlugin } from 'humming';
  
  export const myPlugin = definePlugin({
    name: 'my-plugin',
    meta: {
      priority: 10,                 // 优先级，大值优先执行
      mode: ['development'],        // 支持运行的 NODE_ENV 模式
      dependencies: ['other-plugin'],// 声明必须先被启用的依赖插件
      conflicts: ['conflicting-plugin'], // 声明不能同时启用的冲突插件
      debugLabel: 'My Custom Label' // 可视化日志标签
    },
    setup(context) {
      // 挂载路由或中间件，注册前置/后置转发钩子等
    }
  });
  ```
* **生命周期与资源清理**：
  * 插件在 `setup` 期间执行初始化动作，支持返回同步/异步清理函数（或者在 `context` 注册 `onDispose`）。
  * 应用程序实例被销毁时（执行 `app.dispose()`），插件的所有清理函数必须被**逆序**触发，以妥善释放定时器、数据库连接等外部套接字。

### 4. 命令行工具规格 (CLI Spec)
* **初始化指令**：使用 `humming init <project-name> --template <template-name>`，提供开箱即用的脚手架模板。

---

## 二、 开发与系统约束 (Constraints)

为了保证项目的长期可维护性与极致清晰度，所有开发者必须严格遵守以下五大约束规范。这些约束可通过单元测试及静态分析进行自动化验证：

### 1. 核心与插件隔离约束 (Core-Plugin Boundary Constraint)
* **规则**：所有非核心逻辑（如 CORS、请求限流、JWT/Bearer 认证、业务路由等）禁止以任何形式直接写入 `src/core/` 目录中。必须在 `src/plugins/` 下以插件形式实现并封装，然后通过 `plugins` 数组传入 `createApp` 初始化。

### 2. 零魔法显式装配原则 (Zero-Magic Constraint)
* **规则**：严禁在核心或框架中引入自动路由扫描、隐式插件文件夹发现、动态的类加载和依赖反射。所有运行的插件和功能，必须通过代码显式声明并传入 `createAppSync` / `createApp`，确保调用链路 100% 可被静态查阅和调试。

### 3. 运行时与环境强依赖约束 (Runtime & Node.js Isolation)
* **规则**：`humming` 专属为 Bun 运行时定制（`Bun >= 1.3.0`），深度整合并依赖于 Bun 的 HTTP 服务器机制及 Hono 框架。在任何扩展和核心开发中，严禁引入与 Bun 不兼容的原生 Node.js C++ 拓展包，确保在 Bun 环境中的极致性能。

### 4. 统一环境解析与配置校验约束 (Env Isolation Constraint)
* **规则**：除 `src/config/env.ts` 文件外，其他任何源文件（包含核心与插件代码）严禁直接在代码中通过 `process.env` 或 `Bun.env` 随意读取环境变量。所有外部配置信息必须通过统一封装好的 `parseEnv` 进行强类型解析并绑定至系统上下文。

### 5. 逆序无泄漏清理约束 (Disposal & Rollback Constraint)
* **规则**：
  * 每一个插件如果开辟了长连接、异步轮询定时器（Intervals/Timers）或文件描述符等资源，必须在其 `setup` 中调用 `context.onDispose` 注册对应的清理句柄。
  * 出现应用初始化异常（`setup` 抛出错误）时，系统必须自动以逆序执行已被初始化插件的清理流程进行回滚；
  * 执行 `app.dispose()` 时，需妥善等待并捕捉可能存在的清理错误，以 `AggregateError` 形式抛出，绝不允许有未释放的残留资源。
