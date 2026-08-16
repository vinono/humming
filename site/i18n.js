(function () {
  'use strict';

  const STORAGE_KEY = 'humming-site-lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGS = new Set(['en', 'zh']);

const translations = {
  home: {
    en: {
      'meta.title': 'humming | Plugin-first lightweight BFF core for Bun',
      'meta.description':
        'humming is a plugin-first lightweight BFF core for Bun. Experience high-throughput, sub-millisecond low latency proxying and zero-copy streams.',
      'brand.homeAria': 'humming home',
      'lang.switchLabel': 'Language switch',
      'nav.modes': 'Architecture',
      'nav.benchmarks': 'Benchmarks',
      'nav.pipeline': 'Pipeline',
      'nav.plugins': 'Plugins',
      'nav.cli': 'CLI',
      'nav.docs': 'Docs',
      'nav.github': 'GitHub',
      'hero.ribbon': 'Bun-first BFF core v0.1.0',
      'hero.eyebrow': 'Thin BFF kernel for frontend-owned backends',
      'hero.title': 'Build a small BFF on Bun without dragging in a full framework.',
      'hero.lede':
        'Humming keeps the core deliberately narrow: health, options, and forward. Compose auth, cache, and metrics through a reactive plugin mesh.',
      'hero.ctaDocs': 'Explore Docs ↗',
      'hero.ctaGithub': 'View on GitHub',
      'hero.cliCopy': 'bunx humming init my-bff',
      'hero.cliCopied': 'Copied to clipboard!',
      'player.modeFast': 'Fast-Path',
      'player.modeMesh': 'Plugin Mesh',
      'player.modeForward': 'Forward Proxy',
      'player.modeMinimal': 'Minimal Core',
      'player.telemetryRps': 'Throughput',
      'player.telemetryLatency': 'Proxy Latency',
      'player.telemetryMem': 'Memory Footprint',
      'player.metaTitle': 'humming kernel monitor',
      'player.metaSub': 'Zero-Copy Stream Pipeline · Bun Native Runtime',
      'player.canvasDesc': 'Live event-loop traffic monitor responding to Bun kernel throughput dynamics.',
      'eco.label': 'Built with and powered by the modern runtime ecosystem',
      'modes.eyebrow': 'Runtime States',
      'modes.title': 'Core Execution Modes',
      'modes.subtitle':
        'Switch between dedicated operational modes designed to balance raw throughput, middleware isolation, and developer experience.',
      'modes.card1.num': '01 / SPEED',
      'modes.card1.title': 'Kernel Fast-Path',
      'modes.card1.desc':
        'Sub-millisecond route dispatching built on Bun native primitives and Hono with zero intermediate overhead.',
      'modes.card1.action': 'Inspect Kernel',
      'modes.card2.num': '02 / EXTENSIBILITY',
      'modes.card2.title': 'Plugin Mesh',
      'modes.card2.desc':
        'Composable lifecycle hooks allow injecting auth guards, caching layers, and rate limiters without polluting core logic.',
      'modes.card2.action': 'Explore Plugins',
      'modes.card3.num': '03 / RELIABILITY',
      'modes.card3.title': 'Transport Forward',
      'modes.card3.desc':
        'Upstream proxying with transport-aware strategies, zero-copy streaming, timeout interception, and automatic retries.',
      'modes.card3.action': 'View Forward Rules',
      'modes.card4.num': '04 / SIMPLICITY',
      'modes.card4.title': 'Frontend-Owned',
      'modes.card4.desc':
        'No heavy controller hierarchies or enterprise gateway ceremony. Pure TypeScript configuration tailored for UI teams.',
      'modes.card4.action': 'See Examples',
      'benchmarks.eyebrow': 'Backed by Benchmarks',
      'benchmarks.title': 'Engineered for Radical Performance',
      'benchmarks.subtitle':
        'By stripping away bloated legacy runtime layers, Humming achieves ultra-fast response times and minimal server resource consumption.',
      'benchmarks.stat1.val': '7.2x',
      'benchmarks.stat1.title': 'Higher Throughput',
      'benchmarks.stat1.sub': 'vs standard Express/Node.js BFF gateways on equal CPU cores.',
      'benchmarks.stat2.val': '<0.6ms',
      'benchmarks.stat2.title': 'Proxy Overhead',
      'benchmarks.stat2.sub': 'Ultra-low hop latency between client and upstream microservices.',
      'benchmarks.stat3.val': '16MB',
      'benchmarks.stat3.title': 'Base Memory',
      'benchmarks.stat3.sub': 'Idle footprint allows scaling hundreds of isolated edge instances.',
      'benchmarks.stat4.val': '100%',
      'benchmarks.stat4.title': 'TypeScript Native',
      'benchmarks.stat4.sub': 'Zero compile step required with Bun first-class execution.',
      'pipeline.eyebrow': 'Interactive Flow',
      'pipeline.title': 'Live Pipeline Visualizer',
      'pipeline.subtitle':
        'Trigger simulated requests to watch packets propagate through middleware hooks, kernel routing, and upstream dispatch.',
      'pipeline.send': 'Fire Request',
      'pipeline.nodeClient': 'Client Request',
      'pipeline.nodeClientSub': 'HTTP / WebSocket',
      'pipeline.nodePlugin': 'Plugin Hook',
      'pipeline.nodePluginSub': 'Auth & RateLimit',
      'pipeline.nodeCore': 'Humming Kernel',
      'pipeline.nodeCoreSub': 'Route Matching',
      'pipeline.nodeUpstream': 'Upstream Service',
      'pipeline.nodeUpstreamSub': 'gRPC / REST API',
      'pipeline.nodeRes': 'Response Morph',
      'pipeline.nodeResSub': 'Transformed Body',
      'plugins.eyebrow': 'Ecosystem',
      'plugins.title': 'Official Plugin Matrix',
      'plugins.subtitle':
        'Modular, tree-shakeable official plugins designed for instant plug-and-play integration.',
      'cli.eyebrow': 'Developer Experience',
      'cli.title': 'From Zero to BFF in Seconds',
      'cli.subtitle':
        'The included Bun CLI scaffolds starter templates, registers plugins, and manages production builds with zero hassle.',
      'cli.f1': 'Interactive template generator with official plugins pre-wired',
      'cli.f2': 'Single-command dev server with instant TypeScript hot-reload',
      'cli.f3': 'Multi-platform Docker containerization ready out of the box',
      'footer.desc': 'Humming is an open-source lightweight BFF core for Bun.',
      'footer.docs': 'Documentation',
      'footer.github': 'GitHub Repo',
      'footer.releases': 'Releases',
      'footer.license': 'MIT / Apache-2.0 License',
      'footer.allRights': 'Crafted for high-performance frontend teams.'
    },
    zh: {
      'meta.title': 'humming | 专为 Bun 打造的轻量级插件化 BFF 核心',
      'meta.description':
        'humming 是专为 Bun 打造的轻量级 BFF 核心。轻快纯粹，提供微秒级代理开销、高并发吞吐与零拷贝流式转发。',
      'brand.homeAria': 'humming 首页',
      'lang.switchLabel': '语言切换',
      'nav.modes': '架构形态',
      'nav.benchmarks': '性能基准',
      'nav.pipeline': '链路演练',
      'nav.plugins': '官方插件',
      'nav.cli': '脚手架 CLI',
      'nav.docs': '开发文档',
      'nav.github': 'GitHub',
      'hero.ribbon': 'Bun 原生轻量 BFF 内核 v0.1.0',
      'hero.eyebrow': '专为前端及平台团队设计的轻量 BFF 方案',
      'hero.title': '轻快纯粹，专为 Bun 打造的轻量 BFF 内核。',
      'hero.lede':
        'Humming 专注保持内核极简：内置 health、options 与 forward。鉴权、缓存、熔断等扩展能力，皆通过插件体系灵活组合。',
      'hero.ctaDocs': '查阅文档 ↗',
      'hero.ctaGithub': '访问 GitHub',
      'hero.cliCopy': 'bunx humming init my-bff',
      'hero.cliCopied': '已复制到剪贴板！',
      'player.modeFast': '极速直通',
      'player.modeMesh': '插件网络',
      'player.modeForward': '智能转发',
      'player.modeMinimal': '极简内核',
      'player.telemetryRps': '吞吐能力',
      'player.telemetryLatency': '代理开销',
      'player.telemetryMem': '常驻内存',
      'player.metaTitle': 'Humming 内核流监控',
      'player.metaSub': '零拷贝流式传输 · Bun 原生运行时',
      'player.canvasDesc': '实时请求流态感知，动态呈现 Bun 事件循环与吞吐负载。',
      'eco.label': '深度协同现代高性能运行时与云原生生态',
      'modes.eyebrow': '架构形态',
      'modes.title': '四大核心运行模式',
      'modes.subtitle':
        '兼顾极限吞吐性能、中间件解耦与前端开发体验，按需选用最契合的运行形态。',
      'modes.card1.num': '01 / 极速直通',
      'modes.card1.title': 'Kernel Fast-Path',
      'modes.card1.desc':
        '基于 Bun 原生底层与 Hono 高性能路由引擎，微秒级响应分发，零中间冗余开销。',
      'modes.card1.action': '查看内核机制',
      'modes.card2.num': '02 / 插件解耦',
      'modes.card2.title': 'Plugin Mesh',
      'modes.card2.desc':
        '生命周期钩子驱动，按需接入鉴权、缓存、熔断与限流，核心业务逻辑保持纯粹。',
      'modes.card2.action': '浏览官方插件',
      'modes.card3.num': '03 / 传输可靠',
      'modes.card3.title': 'Transport Forward',
      'modes.card3.desc':
        '传输感知转发层，支持零拷贝流式代理、自适应超时控制与微服务故障重试策略。',
      'modes.card3.action': '转发规则配置',
      'modes.card4.num': '04 / 前端自治',
      'modes.card4.title': 'Frontend-Owned',
      'modes.card4.desc':
        '摆脱传统后端冗长的控制器与繁复配置，纯 TypeScript 驱动，前端团队轻松闭环。',
      'modes.card4.action': '快速上手示例',
      'benchmarks.eyebrow': '实测性能基准',
      'benchmarks.title': '以极致指标，重构微网关性能边界',
      'benchmarks.subtitle':
        '剥离传统框架冗余层，在高并发流量下依然保持微秒级响应与超低资源消耗。',
      'benchmarks.stat1.val': '7.2x',
      'benchmarks.stat1.title': '吞吐性能大幅跃升',
      'benchmarks.stat1.sub': '同等 CPU 规格下，并发吞吐量远超传统 Node.js / Express 网关。',
      'benchmarks.stat2.val': '<0.6ms',
      'benchmarks.stat2.title': '极致转发低延迟',
      'benchmarks.stat2.sub': '客户端到上游微服务的透明代理转发耗时不足 0.6 毫秒。',
      'benchmarks.stat3.val': '16MB',
      'benchmarks.stat3.title': '超低常驻内存占用',
      'benchmarks.stat3.sub': '极度精简的空闲内存占用，单机轻松弹性支撑数百个独立实例。',
      'benchmarks.stat4.val': '100%',
      'benchmarks.stat4.title': 'TypeScript 原生直跑',
      'benchmarks.stat4.sub': '原生支持 TypeScript，无需任何构建配置与打包转译，即写即跑。',
      'pipeline.eyebrow': '流程演练',
      'pipeline.title': '实时请求链路可视化',
      'pipeline.subtitle':
        '触发模拟请求，直观观察数据包在中间件钩子、内核路由与上游微服务间的流转轨迹。',
      'pipeline.send': '触发请求',
      'pipeline.nodeClient': '客户端请求',
      'pipeline.nodeClientSub': 'HTTP / WebSocket',
      'pipeline.nodePlugin': '插件钩子拦截',
      'pipeline.nodePluginSub': '鉴权与限流',
      'pipeline.nodeCore': 'Humming 内核',
      'pipeline.nodeCoreSub': '精确路由匹配',
      'pipeline.nodeUpstream': '上游微服务',
      'pipeline.nodeUpstreamSub': 'REST / gRPC',
      'pipeline.nodeRes': '响应重塑',
      'pipeline.nodeResSub': '数据裁剪与转换',
      'plugins.eyebrow': '官方插件',
      'plugins.title': '开箱即用的插件矩阵',
      'plugins.subtitle':
        '模块化、可摇树优化的官方插件，一行代码即插即用。',
      'cli.eyebrow': '开发体验',
      'cli.title': '秒级初始化全新 BFF 工程',
      'cli.subtitle':
        '内置 Bun 原生 CLI，提供交互式模板脚手架、官方插件预设与生产镜像构建。',
      'cli.f1': '交互式模板生成器，开箱预置常用官方插件',
      'cli.f2': '单行命令启动开发服务器，享受毫秒级 TypeScript 热重载',
      'cli.f3': '开箱即用的轻量级 Docker 多架构容器化配置',
      'footer.desc': 'Humming 是专为 Bun 打造的开源轻量级插件化 BFF 核心。',
      'footer.docs': '开发文档',
      'footer.github': 'GitHub 仓库',
      'footer.releases': '版本发布',
      'footer.license': 'MIT / Apache-2.0 开源协议',
      'footer.allRights': '为追求极致性能的前端团队倾力打造。'
    }
  },
  docs: {
    en: {
      'meta.title': 'humming Docs | Documentation Portal',
      'meta.description':
        'Documentation entry for humming: overview, plugin system, CLI, transport, production, benchmark, and plugin authoring guides.',
      'brand.homeAria': 'humming home',
      'brand.docs': 'humming docs',
      'lang.switchLabel': 'Language switch',
      'brand.docs': 'humming docs',
      'nav.home': 'Home',
      'nav.docsPortal': 'Docs Portal',
      'nav.readme': 'README',
      'nav.portalBtn': '← Portal',
      'nav.tracks': 'Tracks',
      'nav.core': 'Core',
      'nav.examples': 'Examples',
      'nav.ops': 'Ops',
      'nav.backHome': '← Landing Page',
      'doc.readGuide': 'Read Guide →',
      'hero.eyebrow': 'Documentation entry',
      'hero.title': 'Find the shortest path from evaluation to implementation.',
      'hero.lede':
        'This page is the entry point for the current humming docs set. The detailed guides still live in Markdown so they stay close to the codebase and version history.',
      'hero.pathsLabel': 'Recommended reading paths',
      'hero.pathOne': '<strong>Evaluating humming:</strong> overview → README → plugin system',
      'hero.pathTwo': '<strong>Starting a new app:</strong> CLI → examples → production',
      'hero.pathThree': '<strong>Tuning forward:</strong> transport → benchmark → production',
      'hero.pathFour': '<strong>Building extensions:</strong> plugin system → plugin guide',
      'tracks.eyebrow': 'Reading tracks',
      'tracks.title': 'Pick the path that matches the job in front of you.',
      'tracks.evaluate.token': 'evaluate',
      'tracks.evaluate.title': 'Assess Architectural Fit',
      'tracks.evaluate.body': 'Understand core boundaries, runtime trade-offs, and positioning before implementation.',
      'tracks.start.token': 'start',
      'tracks.start.title': 'Bootstrap a New BFF',
      'tracks.start.body': 'Scaffold with CLI templates, inspect runnable examples, and review production deployment.',
      'tracks.extend.token': 'extend',
      'tracks.extend.title': 'Build Plugins & Hooks',
      'tracks.extend.body': 'Master the plugin lifecycle model and implement custom forward transport interceptors.',
      'tracks.operate.token': 'operate',
      'tracks.operate.title': 'Production & Tuning',
      'tracks.operate.body': 'Configure transport policies, evaluate local benchmarks, and track the technical roadmap.',
      'core.eyebrow': 'Core guides',
      'core.title': 'Read the architecture and runtime boundaries first.',
      'core.overview.title': 'Architecture Overview',
      'core.overview.body': 'Design philosophy, core boundaries, layered architecture, and evaluation criteria.',
      'core.plugin.title': 'Plugin System',
      'core.plugin.body': 'Extension lifecycle, governance standards, middleware execution order, and custom extensions.',
      'core.transport.title': 'Transport & Forwarding',
      'core.transport.body': 'Transport strategies, KeepAlive connection pooling, retry policies, and custom transport hooks.',
      'core.production.title': 'Production Readiness',
      'core.production.body': 'Deployment topology, observability, auth guards, caching rules, and runtime stability.',
      'tooling.eyebrow': 'Tooling guides',
      'tooling.title': 'Use the CLI and benchmark docs when you want to move quickly.',
      'tooling.cli.title': 'CLI Toolchain',
      'tooling.cli.body': 'Bootstrap new projects from official templates and standardize local developer workflows.',
      'tooling.benchmark.title': 'Benchmarking & Metrics',
      'tooling.benchmark.body': 'Measure forward proxy overhead, benchmark throughput, and verify sub-millisecond latencies.',
      'tooling.guide.title': 'Plugin Authoring Guide',
      'tooling.guide.body': 'Code-level tutorials, implementation patterns, and end-to-end examples for authoring plugins.',
      'tooling.readme.title': 'Quickstart README',
      'tooling.readme.body': 'Project repository homepage with quick start guide, official plugins, and runnable examples.',
      'examples.eyebrow': 'Examples',
      'examples.title': 'Map the docs to runnable templates.',
      'examples.body':
        'The examples folder is the fastest way to move from concepts to a running app. Use the matching example after each guide instead of trying to absorb everything at once.',
      'ops.eyebrow': 'Operational depth',
      'ops.title': 'When the question is operational, follow the transport-to-rollout path.',
      'ops.body':
        'Humming is small, but the forward path, startup summaries, plugin lifecycle, and production boundaries still deserve deliberate reading. This set is the shortest way to get there.',
      'ops.transport.title': 'Transport Policies',
      'ops.transport.body': 'Fine-tune retry policies, connection reuse, streaming proxying, and route-level transports.',
      'ops.production.title': 'Production Checklist',
      'ops.production.body': 'Review architecture topology, authentication layers, metrics, and security baseline.',
      'ops.benchmark.title': 'Benchmark Workflow',
      'ops.benchmark.body': 'Use local forward benchmarks as regression gates before altering transport logic.',
      'ops.spec.title': 'Spec & Constraints',
      'ops.spec.body': 'Review runtime constraints, environment isolation rules, and architectural boundaries.',
      'footer.tagline': 'Detailed docs live in versioned Markdown files inside this repository.',
      'footer.home': 'Home',
      'footer.readme': 'README',
      'footer.docsFolder': 'Docs Folder',
      'footer.allRights': 'Crafted for high-performance frontend teams.'
    },
    zh: {
      'meta.title': 'humming 开发文档 | 核心文档门户',
      'meta.description':
        'humming 官方文档入口：涵盖架构概览、插件系统、CLI 命令行、传输层转发、生产环境指南、基准测试与插件开发教程。',
      'brand.homeAria': 'humming 首页',
      'brand.docs': 'humming 技术文档',
      'lang.switchLabel': '语言切换',
      'nav.home': '首页',
      'nav.docsPortal': '文档门户',
      'nav.readme': 'README',
      'nav.portalBtn': '← 返回门户',
      'nav.tracks': '阅读路径',
      'nav.core': '核心指南',
      'nav.examples': '示例工程',
      'nav.ops': '运维调优',
      'nav.backHome': '← 返回首页',
      'doc.readGuide': '阅读指南 →',
      'hero.eyebrow': '文档导航入口',
      'hero.title': '从选型评估到生产落地的一站式指南',
      'hero.lede':
        '本站是 Humming 官方文档导航入口。核心技术指南与源码仓库及版本历史保持实时同步更新。',
      'hero.pathsLabel': '推荐阅读路径',
      'hero.pathOne': '<strong>评估与选型：</strong> 架构概览 → README → 插件系统',
      'hero.pathTwo': '<strong>快速起步：</strong> CLI 脚手架 → 示例工程 → 生产配置',
      'hero.pathThree': '<strong>转发调优：</strong> 传输层策略 → 压测基准 → 生产实践',
      'hero.pathFour': '<strong>扩展开发：</strong> 插件体系架构 → 插件编写指南',
      'tracks.eyebrow': '场景化阅读路径',
      'tracks.title': '选择与您当前任务匹配的学习路径。',
      'tracks.evaluate.token': '评估',
      'tracks.evaluate.title': '明确架构定位与边界',
      'tracks.evaluate.body': '在查看具体实现细节前，先厘清 Humming 的设计哲学与能力边界。',
      'tracks.start.token': '上手',
      'tracks.start.title': '快速构建新工程',
      'tracks.start.body': '通过 CLI 一键初始化模板，参考官方示例快速成型，再进入生产就绪指南。',
      'tracks.extend.token': '扩展',
      'tracks.extend.title': '编写业务插件与钩子',
      'tracks.extend.body': '深入理解插件生命周期模型，随后参考开发指南定制业务插件与转发钩子。',
      'tracks.operate.token': '运维',
      'tracks.operate.title': '生产部署与性能调优',
      'tracks.operate.body': '重点关注传输策略、生产环境配置、基准压测与长期演进规划。',
      'core.eyebrow': '核心设计指南',
      'core.title': '优先阅读系统架构与运行时边界。',
      'core.overview.title': '架构概览',
      'core.overview.body': '设计哲学、能力边界、分层架构与适用场景评估。',
      'core.plugin.title': '插件系统架构',
      'core.plugin.body': '生命周期模型、治理规范、中间件执行时序与扩展开发策略。',
      'core.transport.title': '传输层与转发机制',
      'core.transport.body': '传输策略选择、KeepAlive 连接复用、重试策略与自定义转发钩子。',
      'core.production.title': '生产就绪与部署',
      'core.production.body': '部署形态建议、可观测性、鉴权风控、缓存策略与生产稳定性保障。',
      'tooling.eyebrow': '工具链指南',
      'tooling.title': '借助 CLI 与基准测试工具快速推进。',
      'tooling.cli.title': 'CLI 命令行工具',
      'tooling.cli.body': '通过交互式命令生成工程模板，标准化团队本地初始化与开发流程。',
      'tooling.benchmark.title': '性能基准与压测',
      'tooling.benchmark.body': '度量代理转发损耗、压测并发吞吐并验证微秒级延迟表现。',
      'tooling.guide.title': '插件开发实操指南',
      'tooling.guide.body': '代码级实现范式、最佳实践与官方插件编写完整教程。',
      'tooling.readme.title': '快速入门 README',
      'tooling.readme.body': '项目根目录入口，包含快速上手教程、官方插件矩阵与示例工程概览。',
      'examples.eyebrow': '示例工程',
      'examples.title': '直接查看可运行的模版工程。',
      'examples.body':
        'examples 目录是将概念转化为运行中应用的最快方式。建议阅读完每篇指南后直接运行对应示例，避免一次性吸收过多概念。',
      'ops.eyebrow': '运维调优',
      'ops.title': '针对运维与底层问题，深入传输与上线体系。',
      'ops.body':
        '虽然 humming 体积精简，但转发路径、启动摘要、插件生命周期与生产安全边界依然值得深入研读。',
      'ops.transport.title': '传输策略与连接管理',
      'ops.transport.body': '深入超时重试、连接复用、流式代理与路由级传输策略配置。',
      'ops.production.title': '生产上线核对清单',
      'ops.production.body': '审视服务部署形态、鉴权层、可观测性指标与转发安全基线。',
      'ops.benchmark.title': '基准测试工作流',
      'ops.benchmark.body': '在更改传输层逻辑前，利用本地压测工作流作为质量与性能回归验证。',
      'ops.spec.title': '设计约束与规范',
      'ops.spec.body': '深入研读运行时约束、环境变量隔离规范与架构边界原则。',
      'footer.tagline': '详细开发文档均以版本化 Markdown 文件的形式保存在代码库中。',
      'footer.home': '首页',
      'footer.readme': 'README',
      'footer.docsFolder': 'Docs 目录',
      'footer.allRights': '为追求极致性能的前端团队倾力打造。'
    }
  }
};

function getSavedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.has(saved)) return saved;
  } catch (_) {}
  const nav = navigator.language ? navigator.language.slice(0, 2) : '';
  return SUPPORTED_LANGS.has(nav) ? nav : DEFAULT_LANG;
}

function setSavedLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {}
}

function applyTranslations(lang) {
  const page = document.body.getAttribute('data-page') || 'home';
  const pageTranslations = translations[page] && translations[page][lang] ? translations[page][lang] : translations.home[lang];
  if (!pageTranslations) return;

  document.documentElement.lang = lang;

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = pageTranslations[key];
    if (!translation) return;

    const attr = el.getAttribute('data-i18n-attr');
    const isHtml = el.getAttribute('data-i18n-mode') === 'html' || translation.includes('<');
    if (attr) {
      el.setAttribute(attr, translation);
    } else if (isHtml) {
      el.innerHTML = translation;
    } else {
      el.textContent = translation;
    }
  });

  document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
    const target = btn.getAttribute('data-lang-switch');
    if (target === lang) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  window.dispatchEvent(new CustomEvent('humming:lang-changed', { detail: { lang } }));
}

document.addEventListener('DOMContentLoaded', () => {
  const initialLang = getSavedLang();
  applyTranslations(initialLang);

  document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetLang = btn.getAttribute('data-lang-switch');
      if (SUPPORTED_LANGS.has(targetLang)) {
        setSavedLang(targetLang);
        applyTranslations(targetLang);
      }
    });
  });
});
})();
