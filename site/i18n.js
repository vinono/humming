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
      'benchmarks.stat1.title': '吞吐量大幅提升',
      'benchmarks.stat1.sub': '同等 CPU 条件下，吞吐大幅超越传统 Node.js / Express BFF 网关。',
      'benchmarks.stat2.val': '<0.6ms',
      'benchmarks.stat2.title': '极低代理损耗',
      'benchmarks.stat2.sub': '客户端与上游微服务间的透明转发延迟极低。',
      'benchmarks.stat3.val': '16MB',
      'benchmarks.stat3.title': '超小常驻内存',
      'benchmarks.stat3.sub': '极致轻量的内存占用，单机轻松支持部署数百个独立微网关实例。',
      'benchmarks.stat4.val': '100%',
      'benchmarks.stat4.title': 'TypeScript 原生',
      'benchmarks.stat4.sub': '基于 Bun 一等公民执行能力，开箱即用，无需预编译打包。',
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
      'nav.home': 'Home',
      'nav.tracks': 'Tracks',
      'nav.core': 'Core',
      'nav.examples': 'Examples',
      'nav.ops': 'Ops',
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
      'tracks.evaluate.title': 'Assess fit first',
      'tracks.evaluate.body': 'Start with positioning and boundaries before reading implementation details.',
      'tracks.start.token': 'start',
      'tracks.start.title': 'Launch a new app',
      'tracks.start.body': 'Use the CLI, inspect examples, then move into production guidance once the shape is clear.',
      'tracks.extend.token': 'extend',
      'tracks.extend.title': 'Build plugins and hooks',
      'tracks.extend.body': 'Understand the plugin model first, then drop to the authoring guide and forward hooks.',
      'tracks.operate.token': 'operate',
      'tracks.operate.title': 'Prepare for rollout',
      'tracks.operate.body': 'Focus on transport policy, production guidance, local benchmarks, and the current roadmap.',
      'core.eyebrow': 'Core guides',
      'core.title': 'Read the architecture and runtime boundaries first.',
      'core.overview.title': 'Overview',
      'core.overview.body': 'Positioning, architecture, core boundaries, and when humming is the right fit.',
      'core.plugin.title': 'Plugin system',
      'core.plugin.body': 'Extension model, governance direction, execution order, and growth strategy.',
      'core.transport.title': 'Transport',
      'core.transport.body': 'Forward transport strategies, keepalive, retry policy, and custom transport hooks.',
      'core.production.title': 'Production',
      'core.production.body': 'Runtime setup, operational concerns, and how to keep the service predictable.',
      'tooling.eyebrow': 'Tooling guides',
      'tooling.title': 'Use the CLI and benchmark docs when you want to move quickly.',
      'tooling.cli.title': 'CLI',
      'tooling.cli.body': 'Scaffold apps from templates and standardize local project bootstrapping.',
      'tooling.benchmark.title': 'Benchmark',
      'tooling.benchmark.body': 'Measure the forward baseline and compare direct upstream calls with proxied traffic.',
      'tooling.guide.title': 'Plugin guide',
      'tooling.guide.body': 'Code-level authoring details, examples, and patterns for building custom plugins.',
      'tooling.readme.title': 'Repository README',
      'tooling.readme.body': 'Main project landing page with quick start, official plugins, and examples.',
      'examples.eyebrow': 'Examples',
      'examples.title': 'Map the docs to runnable templates.',
      'examples.body':
        'The examples folder is the fastest way to move from concepts to a running app. Use the matching example after each guide instead of trying to absorb everything at once.',
      'ops.eyebrow': 'Operational depth',
      'ops.title': 'When the question is operational, follow the transport-to-rollout path.',
      'ops.body':
        'Humming is small, but the forward path, startup summaries, plugin lifecycle, and production boundaries still deserve deliberate reading. This set is the shortest way to get there.',
      'ops.transport.title': 'Transport policy',
      'ops.transport.body': 'Understand retry, keepalive, custom transport boundaries, and route-level selection.',
      'ops.production.title': 'Production guide',
      'ops.production.body': 'Review deployment shape, auth, cache, logging, metrics, and forward safety expectations.',
      'ops.benchmark.title': 'Benchmark workflow',
      'ops.benchmark.body': 'Use the local forward benchmark as a regression signal before changing transport behavior.',
      'ops.roadmap.title': 'Roadmap',
      'ops.roadmap.body': 'See which maturity gaps are being closed now and which areas intentionally wait.',
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
      'brand.docs': 'humming 开发文档',
      'lang.switchLabel': '语言切换',
      'nav.home': '首页',
      'nav.tracks': '阅读路径',
      'nav.core': '核心指南',
      'nav.examples': '示例库',
      'nav.ops': '运维深度',
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
      'tracks.evaluate.title': '明确架构定位',
      'tracks.evaluate.body': '在查看具体实现细节前，先厘清 Humming 的能力边界与设计哲学。',
      'tracks.start.token': '上手',
      'tracks.start.title': '快速启动工程',
      'tracks.start.body': '通过 CLI 一键初始化模板，参考官方示例快速成型，再进入生产就绪指南。',
      'tracks.extend.token': '扩展',
      'tracks.extend.title': '编写插件与钩子',
      'tracks.extend.body': '深入理解插件生命周期模型，随后参考开发指南定制业务插件与转发钩子。',
      'tracks.operate.token': '运维',
      'tracks.operate.title': '生产就绪与调优',
      'tracks.operate.body': '重点关注传输策略、生产环境配置、基准测试与演进规划。',
      'core.eyebrow': '核心设计指南',
      'core.title': '优先阅读系统架构与运行时边界。',
      'core.overview.title': '架构概览',
      'core.overview.body': '产品定位、分层架构、核心能力边界及何时选择 humming。',
      'core.plugin.title': '插件系统',
      'core.plugin.body': '扩展模型、治理规范、插件执行生命周期顺序与扩展策略。',
      'core.transport.title': '传输层转发',
      'core.transport.body': '转发传输策略、KeepAlive 保持、重试策略与自定义转发钩子。',
      'core.production.title': '生产环境指南',
      'core.production.body': '运行时配置、生产运维考量及如何保持服务的可预测性。',
      'tooling.eyebrow': '工具链指南',
      'tooling.title': '借助 CLI 与基准测试工具快速推进。',
      'tooling.cli.title': 'CLI 脚手架',
      'tooling.cli.body': '从官方模板一键生成项目，标准化团队本地工程初始化。',
      'tooling.benchmark.title': '基准测试',
      'tooling.benchmark.body': '度量转发基准开销，对比直连上游与代理流量的微秒级损耗。',
      'tooling.guide.title': '插件开发指南',
      'tooling.guide.body': '代码级编写细节、官方模式与自定义插件实战范例。',
      'tooling.readme.title': '仓库主 README',
      'tooling.readme.body': '项目根目录首页，包含快速入门、官方插件与示例汇总。',
      'examples.eyebrow': '示例工程',
      'examples.title': '直接查看可运行的模版工程。',
      'examples.body':
        'examples 目录是将概念转化为运行中应用的最快方式。建议阅读完每篇指南后直接运行对应示例，避免一次性吸收过多概念。',
      'ops.eyebrow': '运维深度',
      'ops.title': '针对运维与底层问题，深入传输与上线体系。',
      'ops.body':
        '虽然 humming 体积精简，但转发路径、启动摘要、插件生命周期与生产安全边界依然值得深入研读。',
      'ops.transport.title': '传输策略',
      'ops.transport.body': '深入重试、连接复用、自定义传输边界与路由级策略配置。',
      'ops.production.title': '生产就绪指南',
      'ops.production.body': '审视部署形态、鉴权、缓存、日志指标与转发安全基线。',
      'ops.benchmark.title': '基准测试工作流',
      'ops.benchmark.body': '在更改传输层逻辑前，利用本地转发压测作为回归验证信号。',
      'ops.roadmap.title': '演进路线图',
      'ops.roadmap.body': '了解当前正在补齐的成熟度能力以及有意延后推进的领域。',
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
