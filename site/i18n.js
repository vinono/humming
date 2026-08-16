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
      'hero.title': 'High-Throughput, Thin BFF Core on Bun.',
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
      'meta.title': 'humming | Bun 原生轻量级插件化 BFF 核心',
      'meta.description':
        'humming 是专为 Bun 打造的轻量级插件化 BFF 核心。体验高吞吐、微秒级网关路由与零拷贝流式转发。',
      'brand.homeAria': 'humming 首页',
      'lang.switchLabel': '语言切换',
      'nav.modes': '架构模式',
      'nav.benchmarks': '性能基准',
      'nav.pipeline': '流水线',
      'nav.plugins': '插件生态',
      'nav.cli': '脚手架 CLI',
      'nav.docs': '开发文档',
      'nav.github': 'GitHub',
      'hero.ribbon': 'Bun 原生 BFF 核心 v0.1.0',
      'hero.eyebrow': '专为前端团队打造的轻量级 BFF 内核',
      'hero.title': '极致高吞吐的 Bun 轻量级 BFF 运行时。',
      'hero.lede':
        'Humming 将核心控制在最窄边界：health、options 与 forward。所有扩展能力均通过响应式插件网络按需拼装。',
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
      'player.metaTitle': 'humming 内核监控台',
      'player.metaSub': '零拷贝流式转发管道 · Bun 原生底层',
      'player.canvasDesc': '实时事件循环请求流监控，动态映射 Bun 内核吞吐负载。',
      'eco.label': '深度整合现代高性能运行时与云原生生态',
      'modes.eyebrow': '运行时状态',
      'modes.title': '核心执行架构模式',
      'modes.subtitle':
        '在专为高吞吐、中间件隔离与极致开发体验打造的四大运行模式间无缝切换。',
      'modes.card1.num': '01 / 极速',
      'modes.card1.title': '内核极速直通 (Fast-Path)',
      'modes.card1.desc':
        '基于 Bun 原生底层与 Hono 引擎的高性能路由分发，免除传统复杂框架的多层消耗。',
      'modes.card1.action': '查看内核机制',
      'modes.card2.num': '02 / 可扩展',
      'modes.card2.title': '响应式插件网格 (Plugin Mesh)',
      'modes.card2.desc':
        '基于生命周期钩子的插件系统，按需组合鉴权、缓存、熔断与限流，绝不污染核心业务。',
      'modes.card2.action': '浏览官方插件',
      'modes.card3.num': '03 / 可靠性',
      'modes.card3.title': '传输感知转发 (Transport Forward)',
      'modes.card3.desc':
        '支持零拷贝流式转发、自适应超时控制与微服务故障重试策略。',
      'modes.card3.action': '转发规则配置',
      'modes.card4.num': '04 / 零心智负担',
      'modes.card4.title': '前端掌控 (Frontend-Owned)',
      'modes.card4.desc':
        '告别重量级后端控制器与冗长配置仪式，纯 TypeScript 驱动，完全由前端团队自闭环。',
      'modes.card4.action': '快速上手示例',
      'benchmarks.eyebrow': '性能基准数据',
      'benchmarks.title': '用极致指标重新定义轻量',
      'benchmarks.subtitle':
        '剥离臃肿的冗余层，Humming 在高并发请求下依然保持微秒级响应与超低内存消耗。',
      'benchmarks.stat1.val': '7.2x',
      'benchmarks.stat1.title': '吞吐量提升',
      'benchmarks.stat1.sub': '同等 CPU 核心下大幅超越传统 Node.js/Express BFF 网关。',
      'benchmarks.stat2.val': '<0.6ms',
      'benchmarks.stat2.title': '平均代理开销',
      'benchmarks.stat2.sub': '客户端与上游微服务间的穿透转发几乎零延迟。',
      'benchmarks.stat3.val': '16MB',
      'benchmarks.stat3.title': '超低内存占用',
      'benchmarks.stat3.sub': '极致轻量的常驻内存，支持单机部署数百个独立微网关。',
      'benchmarks.stat4.val': '100%',
      'benchmarks.stat4.title': 'TypeScript 原生',
      'benchmarks.stat4.sub': '无需任何繁琐的打包构建步骤，Bun 开箱直接执行。',
      'pipeline.eyebrow': '交互式流程',
      'pipeline.title': '实时请求流水线可视化',
      'pipeline.subtitle':
        '点击发送模拟请求，直观查看数据包如何在中间件钩子、内核路由与上游转发间流动。',
      'pipeline.send': '触发请求',
      'pipeline.nodeClient': '客户端请求',
      'pipeline.nodeClientSub': 'HTTP / WS',
      'pipeline.nodePlugin': '插件钩子拦截',
      'pipeline.nodePluginSub': '鉴权与限流',
      'pipeline.nodeCore': 'Humming 内核',
      'pipeline.nodeCoreSub': '精准路由匹配',
      'pipeline.nodeUpstream': '上游微服务',
      'pipeline.nodeUpstreamSub': 'REST / gRPC',
      'pipeline.nodeRes': '响应转换器',
      'pipeline.nodeResSub': '数据脱敏与裁剪',
      'plugins.eyebrow': '官方插件',
      'plugins.title': '开箱即用的插件矩阵',
      'plugins.subtitle':
        '模块化、可摇树优化的官方插件，一行代码即插即用。',
      'cli.eyebrow': '开发者体验',
      'cli.title': '秒级从零构建 BFF',
      'cli.subtitle':
        '内置的 Bun CLI 提供一键脚手架、官方模板初始化与生产级镜像构建。',
      'cli.f1': '交互式模板初始化，内置常用插件预设',
      'cli.f2': '单指令启动开发服务器，享受极致的 TypeScript 热重载',
      'cli.f3': '开箱即用的轻量级 Docker 容器化支持',
      'footer.desc': 'Humming 是专为 Bun 打造的开源轻量级插件化 BFF 核心。',
      'footer.docs': '开发文档',
      'footer.github': 'GitHub 仓库',
      'footer.releases': '版本发布',
      'footer.license': 'MIT / Apache-2.0 开源协议',
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
    if (attr) {
      el.setAttribute(attr, translation);
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
