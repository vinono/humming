# CLI 脚手架工具链

`humming` 提供了极简直观的命令行脚手架工具，帮助开发者在数秒内基于最佳实践初始化全新的 BFF 工程。

CLI 工具秉持极简克制原则：**专职生成干净、标准的基础工程模板，不引入繁杂沉重的脚手架包装。**

---

## 快速上手命令

### 一键创建新工程

使用 `bunx` 直接免安装运行：

```bash
bunx humming init my-bff
```

### 指定模板创建

通过 `--template` 参数指定预设模板：

```bash
bunx humming init my-bff --template with-plugins
```

### 强制覆盖目录

若目标目录已存在文件，可添加 `--force` 参数：

```bash
bunx humming init my-bff --force
```

---

## 官方预设模板对比

| 模板名称 | 适用场景 | 包含的核心特性 |
| :--- | :--- | :--- |
| **`basic`** | 极简评估、内部 Demo、单体微型接口 | `health` 检查、`options` 字典、无代理终端、极简入口文件 |
| **`with-plugins`** | **推荐首选**：真实业务项目、生产 BFF 开发 | 包含常用官方插件（JWT 鉴权、Prometheus 指标、Redis 缓存、速率限制、CORS、自定义路由示例） |
| **`with-forward`** | 纯转发网关、上游微服务代理调优、联调实验 | 开启流式转发终端、内建 Mock 上游服务器、请求/响应前后置拦截钩子示例 |

---

## 模板选用建议

- **选择 `basic`**：如果您刚刚接触 `humming`，仅需一个最纯粹的 TypeScript HTTP 服务骨架。
- **选择 `with-plugins`**：如果您准备为团队构建生产级业务 BFF，需要参考标准的插件组织范式与中间件配置。
- **选择 `with-forward`**：如果您的核心诉求是代理转发现有后端微服务，并需要对请求头、响应做流式加工或签名鉴权。

---

## 生成的文件结构

CLI 初始化的工程具备纯净的 TypeScript 项目结构：

```text
my-bff/
├── src/
│   ├── index.ts          # 应用入口与插件装配
│   ├── plugins/          # 业务自定义插件目录
│   └── routes/           # 业务子路由模块
├── package.json          # 依赖声明与 npm scripts
├── tsconfig.json         # Bun / TypeScript 严格配置
├── .env.example          # 环境变量示例清单
├── .gitignore
└── README.md             # 项目启动与使用指引
```

初始化完成后，仅需两步即可启动：

```bash
cd my-bff
bun install
bun run dev
```
