const STORAGE_KEY = 'humming-site-lang';
const DEFAULT_LANG = 'en';
const SUPPORTED_LANGS = new Set(['en', 'zh']);

const translations = {
  home: {
    en: {
      'meta.title': 'humming | Plugin-first lightweight BFF core for Bun',
      'meta.description':
        'humming is a plugin-first lightweight BFF core for Bun. Start with health, options, and forward, then extend with plugins and a Bun-first CLI.',
      'brand.homeAria': 'humming home',
      'lang.switchLabel': 'Language switch',
      'nav.useCases': 'Use Cases',
      'nav.examples': 'Examples',
      'nav.ecosystem': 'Ecosystem',
      'nav.cli': 'CLI',
      'nav.ops': 'Ops',
      'nav.docs': 'Docs',
      'nav.readme': 'README',
      'nav.github': 'GitHub',
      'hero.ribbon': 'Bun-first BFF core',
      'hero.eyebrow': 'Thin BFF kernel for frontend-owned backends',
      'hero.title':
        'Build a small BFF on Bun without dragging in a full backend framework.',
      'hero.lede':
        '`humming` keeps the core deliberately narrow: `health`, `options`, and `forward`. Everything else stays composable through plugins, hooks, and explicit runtime configuration.',
      'hero.ctaDocs': 'Open Docs',
      'hero.ctaGithub': 'View on GitHub',
      'hero.pillBun': 'Bun-first',
      'hero.pillPlugin': 'Plugin-first',
      'hero.pillCli': 'CLI included',
      'hero.pillTransport': 'Transport-aware forward',
      'hero.stats.core': 'core built-ins',
      'hero.stats.plugins': 'official plugins',
      'hero.stats.templates': 'starter templates',
      'hero.stats.boundary': 'clear boundary',
      'hero.quickstart.label': 'Quick start',
      'hero.quickstart.code': `bunx humming init my-bff --template with-forward
cd my-bff
bun install
bun run dev`,
      'hero.console.label': 'What you get',
      'hero.console.one': '+ health endpoint',
      'hero.console.two': '+ options routes',
      'hero.console.three': '+ forward rules',
      'hero.console.four': '+ plugin-ready app shell',
      'hero.cardOne.title': 'Core stays small',
      'hero.cardOne.body':
        'Keep `health`, `options`, and `forward` in core and move optional behavior into plugins.',
      'hero.cardTwo.title': 'Scale by composition',
      'hero.cardTwo.body':
        'Add auth, cache, metrics, rate limit, or custom routes only where the project actually needs them.',
      'fit.eyebrow': 'Where it fits',
      'fit.title':
        'Built for thin BFFs, local proxy layers, and frontend teams that want control.',
      'fit.cardOne.title': 'Good fit',
      'fit.cardOne.one': 'project-level BFFs',
      'fit.cardOne.two': 'local routes and small aggregations',
      'fit.cardOne.three': 'upstream forwarding with explicit hooks',
      'fit.cardOne.four': 'frontend-owned runtime extensions',
      'fit.cardTwo.title': 'Not trying to be',
      'fit.cardTwo.one': 'a full API gateway',
      'fit.cardTwo.two': 'a heavy backend application framework',
      'fit.cardTwo.three': 'a hidden-convention platform',
      'fit.cardTwo.four': 'an everything-in-core runtime',
      'fit.cardThree.title': 'Key runtime ideas',
      'fit.cardThree.one': 'plugin-first extension model',
      'fit.cardThree.two': 'explicit forward transport strategy',
      'fit.cardThree.three': 'shared services across plugins',
      'fit.cardThree.four': 'small surface area with readable behavior',
      'useCases.eyebrow': 'Use cases',
      'useCases.title':
        'Use it where teams need a thin edge layer, not a giant backend surface.',
      'useCases.cardOne.token': 'frontend-owned bff',
      'useCases.cardOne.title':
        'Ship a small backend the frontend team can actually maintain.',
      'useCases.cardOne.body':
        'Add local routes, option endpoints, auth guards, and upstream forwarding without pulling the project into a controller-heavy backend stack.',
      'useCases.cardTwo.token': 'local proxy layer',
      'useCases.cardTwo.title':
        'Replace ad hoc dev proxy files with something operationally clearer.',
      'useCases.cardTwo.body':
        'Keep request shaping, transport selection, metrics, and runtime hooks in one readable service that still feels lightweight.',
      'useCases.cardThree.token': 'thin aggregation edge',
      'useCases.cardThree.title':
        'Expose a few composed endpoints without pretending this is a giant platform.',
      'useCases.cardThree.body':
        'Start with small aggregation and request rewriting work close to the UI, then grow through plugins only where the project really needs it.',
      'useCases.cardFour.token': 'team starter kernel',
      'useCases.cardFour.title':
        'Give multiple projects the same BFF baseline without copying proxy glue everywhere.',
      'useCases.cardFour.body':
        'Use the CLI, examples, and official plugins to standardize a small but consistent runtime across apps.',
      'core.eyebrow': 'Core surface',
      'core.title': 'Three built-ins, then extension points.',
      'core.health': 'Simple runtime health endpoint that stays public and predictable.',
      'core.options':
        'Serve dictionaries and option data from static or HTTP-backed providers.',
      'core.forward':
        'Shape and proxy upstream requests with route rules, hooks, and transport strategy selection.',
      'core.flow.client': 'client',
      'core.flow.core': 'humming core',
      'core.flow.plugins': 'plugins',
      'core.flow.upstream': 'upstream services',
      'compare.eyebrow': 'Why this shape',
      'compare.title':
        'Sits between a temporary proxy file and a heavyweight backend platform.',
      'compare.cardOne.token': 'temporary proxy',
      'compare.cardOne.title': 'Fast to start, easy to outgrow.',
      'compare.cardOne.body':
        'Good for a quick local redirect, but it usually stops short of shared plugins, explicit runtime services, transport policy, and observability.',
      'compare.cardTwo.token': 'humming',
      'compare.cardTwo.title':
        'A small kernel with enough structure to stay readable.',
      'compare.cardTwo.body':
        'Keep the core narrow, grow through plugins, and make route, forward, and runtime behavior visible enough that teams can actually maintain it.',
      'compare.cardThree.token': 'heavy framework',
      'compare.cardThree.title': 'Broader surface, more ceremony, different job.',
      'compare.cardThree.body':
        'Useful when the service itself is the full backend platform, but often more infrastructure and abstraction than a thin frontend-facing BFF needs.',
      'ecosystem.eyebrow': 'Plugin ecosystem',
      'ecosystem.title':
        'Grow outward from a stable kernel instead of stuffing optional behavior into core.',
      'ecosystem.pluginsLabel': 'Official plugins',
      'ecosystem.auth.title': 'Auth',
      'ecosystem.auth.body':
        'Protect routes with bearer checks, JWT validation, and role-based rules.',
      'ecosystem.cache.title': 'Cache',
      'ecosystem.cache.body':
        'Cache eligible responses with memory or Redis-backed stores.',
      'ecosystem.metrics.title': 'Metrics',
      'ecosystem.metrics.body':
        'Expose Prometheus-style request metrics close to the BFF edge.',
      'ecosystem.rate.title': 'Rate limit',
      'ecosystem.rate.body':
        'Enforce request ceilings per route, user, or custom key strategy.',
      'ecosystem.cors.title': 'CORS',
      'ecosystem.cors.body':
        'Handle browser-facing preflight and cross-origin policy cleanly.',
      'ecosystem.options.title': 'Options',
      'ecosystem.options.body':
        'Register static and HTTP-backed option sources without cluttering app code.',
      'ecosystem.strategyLabel': 'Extension strategy',
      'ecosystem.storyOne.title': 'Start with official building blocks',
      'ecosystem.storyOne.body':
        'Use the shipped plugins for common operational needs instead of inventing one-off middleware in every project.',
      'ecosystem.storyTwo.title': 'Add custom project plugins',
      'ecosystem.storyTwo.body':
        'Register local routes, middleware, option sources, and forward hooks through the same explicit runtime model.',
      'ecosystem.storyThree.title': 'Leave room for a future ecosystem',
      'ecosystem.storyThree.body':
        '`humming` is already shaped for external plugins and presets, but the kernel stays small so the ecosystem can grow without making core fuzzy.',
      'ecosystem.path.core': 'core',
      'ecosystem.path.official': 'official plugins',
      'ecosystem.path.custom': 'custom plugins',
      'ecosystem.path.future': 'future presets',
      'cli.eyebrow': 'CLI',
      'cli.title': 'Go from empty folder to a working BFF skeleton in one command.',
      'cli.scaffoldLabel': 'Scaffold',
      'cli.scaffoldCode': `bunx humming init acme-bff --template with-plugins

Created acme-bff with the "with-plugins" template.

Next steps:
  cd acme-bff
  bun install
  bun run dev`,
      'cli.shapeLabel': 'Template shape',
      'cli.shapeCode': `acme-bff/
  src/
    main.ts
  package.json
  README.md
  .env.example`,
      'cli.templatesLabel': 'Templates',
      'cli.basic': 'Smallest useful app with core built-ins only.',
      'cli.plugins':
        'Auth, cache, metrics, rate limit, options, and a custom plugin route.',
      'cli.forward': 'Forward rules plus request and response hook examples.',
      'examplesHome.eyebrow': 'Runnable paths',
      'examplesHome.title':
        'Jump from the product story into concrete, runnable examples.',
      'examplesHome.basic.title': 'Core only',
      'examplesHome.basic.body':
        'Start with health and options only when you want the smallest useful app shape.',
      'examplesHome.plugins.title': 'Operational add-ons',
      'examplesHome.plugins.body':
        'See auth, cache, metrics, rate limiting, request logging, and options in one app shell.',
      'examplesHome.forward.title': 'Forward and hook flow',
      'examplesHome.forward.body':
        'Use request and response hooks plus transport-aware forwarding when the BFF needs upstream control.',
      'examplesHome.async.title': 'Async startup',
      'examplesHome.async.body':
        'Reach for `createApp()` when plugin setup needs async work before the app is ready.',
      'opsHome.eyebrow': 'Transport and operations',
      'opsHome.title':
        'The runtime is small, but the operational surface is still intentional.',
      'opsHome.body':
        '`humming` keeps `forward` in core because upstream control is a real BFF concern. That means transport policy, rollout boundaries, regression baselines, and observability deserve first-class guidance instead of scattered notes.',
      'opsHome.transport.title': 'Transport',
      'opsHome.transport.body':
        'Choose between baseline fetch, keepalive-oriented fetch, retrying fetch, or a custom transport contract.',
      'opsHome.production.title': 'Production',
      'opsHome.production.body':
        'Read the deployment model, forward safety stance, metrics guidance, and cache and auth boundaries.',
      'opsHome.benchmark.title': 'Benchmark',
      'opsHome.benchmark.body':
        'Compare direct upstream traffic against forwarded traffic before you change runtime behavior.',
      'opsHome.roadmap.title': 'Roadmap',
      'opsHome.roadmap.body':
        'See where plugin lifecycle, observability, and broader platform maturity are heading next.',
      'docs.eyebrow': 'Documentation',
      'docs.title': 'Start from the entry that matches the job at hand.',
      'docs.portal.title': 'Docs portal',
      'docs.portal.body':
        'Single entry point for overview, plugin system, CLI, transport, production, and benchmark guides.',
      'docs.overview.title': 'Overview',
      'docs.overview.body':
        'Positioning, architecture boundaries, and how the core is meant to stay small.',
      'docs.transport.title': 'Transport',
      'docs.transport.body':
        'Keepalive, retry policy, and custom transport strategy boundaries.',
      'docs.cli.title': 'CLI',
      'docs.cli.body':
        'Scaffold a new app quickly with the Bun-first starter templates.',
      'signals.eyebrow': 'Runtime signals',
      'signals.title': 'Small runtime does not have to mean opaque runtime.',
      'signals.body':
        '`humming` is trying to stay small without forcing teams to debug blind. Startup summaries, forward timings, hook ownership, transport strategy, and plugin cleanup are meant to stay visible as the app grows.',
      'signals.cardOne.title': 'Startup summaries',
      'signals.cardOne.body':
        'See which plugins were enabled and what each one registered during setup.',
      'signals.cardTwo.title': 'Forward phase timing',
      'signals.cardTwo.body':
        'Split matching, hooks, upstream execution, and error handling into separate timing phases.',
      'signals.cardThree.title': 'Hook ownership',
      'signals.cardThree.body':
        'Track which plugins contributed the active forward hook chain for a request.',
      'signals.cardFour.title': 'Explicit teardown',
      'signals.cardFour.body':
        'Dispose plugin resources cleanly instead of letting timers, clients, and shared handles leak into shutdown.',
      'final.eyebrow': 'Start here',
      'final.title':
        'If your team wants a thin BFF with clear boundaries, this is the point of entry.',
      'final.body':
        'Read the docs, inspect the examples, and scaffold a starter app. The project is intentionally trying to stay small enough that you can understand the runtime before the day is over.',
      'final.ctaDocs': 'Open Docs Portal',
      'final.ctaCli': 'See CLI Guide',
      'final.ctaRepo': 'Browse Repository',
      'footer.tagline': 'humming is a plugin-first lightweight BFF core for Bun.',
      'footer.docs': 'Docs',
      'footer.readme': 'README',
      'footer.github': 'GitHub',
    },
    zh: {
      'meta.title': 'humming | 面向 Bun 的插件优先轻量 BFF 内核',
      'meta.description':
        'humming 是一个面向 Bun 的插件优先轻量 BFF 内核。从 health、options、forward 起步，再通过插件和 Bun 风格 CLI 扩展。',
      'brand.homeAria': 'humming 首页',
      'lang.switchLabel': '语言切换',
      'nav.useCases': '适用场景',
      'nav.examples': '示例',
      'nav.ecosystem': '插件生态',
      'nav.cli': '脚手架',
      'nav.ops': '运维',
      'nav.docs': '文档',
      'nav.readme': 'README',
      'nav.github': 'GitHub',
      'hero.ribbon': 'Bun 优先的 BFF 内核',
      'hero.eyebrow': '面向前端自主管理后端的轻量 BFF 内核',
      'hero.title': '在 Bun 上构建一个小而清晰的 BFF，而不是背上整个重量级后端框架。',
      'hero.lede':
        '`humming` 故意把 core 保持得很窄：`health`、`options`、`forward`。其他能力都通过插件、hooks 和显式运行时配置来组合。',
      'hero.ctaDocs': '打开文档',
      'hero.ctaGithub': '查看 GitHub',
      'hero.pillBun': 'Bun 优先',
      'hero.pillPlugin': '插件优先',
      'hero.pillCli': '内置 CLI',
      'hero.pillTransport': '支持 transport 策略',
      'hero.stats.core': 'core 内置能力',
      'hero.stats.plugins': '官方插件',
      'hero.stats.templates': '脚手架模板',
      'hero.stats.boundary': '清晰边界',
      'hero.quickstart.label': '快速开始',
      'hero.quickstart.code': `bunx humming init my-bff --template with-forward
cd my-bff
bun install
bun run dev`,
      'hero.console.label': '默认得到',
      'hero.console.one': '+ health 接口',
      'hero.console.two': '+ options 路由',
      'hero.console.three': '+ forward 规则',
      'hero.console.four': '+ 可扩展插件应用骨架',
      'hero.cardOne.title': 'Core 保持精简',
      'hero.cardOne.body':
        '把 `health`、`options`、`forward` 放在 core，把可选能力放到插件里。',
      'hero.cardTwo.title': '按组合方式扩展',
      'hero.cardTwo.body':
        '只有在项目真正需要时，才加 auth、cache、metrics、rate limit 或自定义 routes。',
      'fit.eyebrow': '定位边界',
      'fit.title': '适合轻量 BFF、本地代理层，以及想要掌控运行时的前端团队。',
      'fit.cardOne.title': '适合',
      'fit.cardOne.one': '项目级 BFF',
      'fit.cardOne.two': '本地路由和小规模聚合',
      'fit.cardOne.three': '带显式 hooks 的上游转发',
      'fit.cardOne.four': '前端自主管理的运行时扩展',
      'fit.cardTwo.title': '不打算成为',
      'fit.cardTwo.one': '完整 API Gateway',
      'fit.cardTwo.two': '重量级后端应用框架',
      'fit.cardTwo.three': '依赖隐式约定的平台',
      'fit.cardTwo.four': '把所有东西都塞进 core 的运行时',
      'fit.cardThree.title': '关键设计点',
      'fit.cardThree.one': '插件优先的扩展模型',
      'fit.cardThree.two': '显式的 forward transport 策略',
      'fit.cardThree.three': '插件间共享服务',
      'fit.cardThree.four': '小而可读的运行时表面',
      'useCases.eyebrow': '适用场景',
      'useCases.title': '当团队需要的是一个薄边缘层，而不是一个巨大的后端体系时，就适合用它。',
      'useCases.cardOne.token': '前端自主管理 BFF',
      'useCases.cardOne.title': '交付一个前端团队真正能自己维护的小后端。',
      'useCases.cardOne.body':
        '增加本地路由、选项接口、鉴权保护和上游转发，而不用把项目拖进 controller/service 式的重后端栈。',
      'useCases.cardTwo.token': '本地代理层',
      'useCases.cardTwo.title': '把零散的 dev proxy 配置替换成更清晰的运行时服务。',
      'useCases.cardTwo.body':
        '把请求改写、transport 选择、metrics 和 runtime hooks 放进一个仍然保持轻量的可读服务里。',
      'useCases.cardThree.token': '轻量聚合边缘层',
      'useCases.cardThree.title': '暴露少量组合接口，而不是假装自己是一个大型平台。',
      'useCases.cardThree.body':
        '从靠近 UI 的小规模聚合和请求改写开始，只在真正需要时通过插件继续生长。',
      'useCases.cardFour.token': '团队级启动内核',
      'useCases.cardFour.title': '让多个项目共享同一套 BFF 基线，而不是到处复制代理胶水代码。',
      'useCases.cardFour.body':
        '借助 CLI、示例和官方插件，在多个应用之间形成小而一致的运行时基础。',
      'core.eyebrow': 'Core 能力',
      'core.title': '先提供三个内置能力，然后通过扩展点生长。',
      'core.health': '简单、公开且可预测的运行时健康检查接口。',
      'core.options': '通过静态或 HTTP provider 暴露字典与选项数据。',
      'core.forward': '通过路由规则、hooks 和 transport 策略选择来代理上游请求。',
      'core.flow.client': '客户端',
      'core.flow.core': 'humming core',
      'core.flow.plugins': '插件',
      'core.flow.upstream': '上游服务',
      'compare.eyebrow': '为什么是这种形状',
      'compare.title': '它位于临时代理配置和重量级后端平台之间。',
      'compare.cardOne.token': '临时代理',
      'compare.cardOne.title': '启动很快，但也很容易很快不够用。',
      'compare.cardOne.body':
        '适合快速做本地转发，但通常不会自然演进出共享插件、显式运行时服务、transport 策略和可观测性。',
      'compare.cardTwo.token': 'humming',
      'compare.cardTwo.title': '一个足够小、但也足够有结构的内核。',
      'compare.cardTwo.body':
        '让 core 保持窄，通过插件生长，同时让路由、forward 和运行时行为保持可见，团队才能真的维护下去。',
      'compare.cardThree.token': '重框架',
      'compare.cardThree.title': '表面更宽、仪式感更强、解决的是另一类问题。',
      'compare.cardThree.body':
        '当服务本身就是完整后端平台时很有价值，但对一个薄的前端侧 BFF 来说，往往意味着更多基础设施和抽象成本。',
      'ecosystem.eyebrow': '插件生态',
      'ecosystem.title': '从稳定内核向外扩展，而不是把可选行为都塞进 core。',
      'ecosystem.pluginsLabel': '官方插件',
      'ecosystem.auth.title': 'Auth',
      'ecosystem.auth.body': '通过 bearer 校验、JWT 验证和角色规则保护路由。',
      'ecosystem.cache.title': 'Cache',
      'ecosystem.cache.body': '用内存或 Redis store 缓存符合条件的响应。',
      'ecosystem.metrics.title': 'Metrics',
      'ecosystem.metrics.body': '在 BFF 边缘暴露 Prometheus 风格的请求指标。',
      'ecosystem.rate.title': 'Rate limit',
      'ecosystem.rate.body': '按路由、用户或自定义 key 策略限制请求。',
      'ecosystem.cors.title': 'CORS',
      'ecosystem.cors.body': '干净地处理浏览器跨域与预检请求。',
      'ecosystem.options.title': 'Options',
      'ecosystem.options.body': '注册静态与 HTTP 选项源，而不用把逻辑塞满应用代码。',
      'ecosystem.strategyLabel': '扩展策略',
      'ecosystem.storyOne.title': '先用官方构件',
      'ecosystem.storyOne.body': '常见运维能力优先用已有插件，而不是每个项目都重新写一套零散 middleware。',
      'ecosystem.storyTwo.title': '再加项目自定义插件',
      'ecosystem.storyTwo.body': '通过同一套显式运行时模型注册本地 routes、middleware、option sources 和 forward hooks。',
      'ecosystem.storyThree.title': '为未来生态留出空间',
      'ecosystem.storyThree.body': '`humming` 已经具备外部插件和 preset 的形状，但 core 仍然保持足够小，避免边界变糊。',
      'ecosystem.path.core': 'core',
      'ecosystem.path.official': '官方插件',
      'ecosystem.path.custom': '自定义插件',
      'ecosystem.path.future': '未来 presets',
      'cli.eyebrow': 'CLI',
      'cli.title': '从空目录到可运行的 BFF 骨架，只需要一条命令。',
      'cli.scaffoldLabel': '初始化',
      'cli.scaffoldCode': `bunx humming init acme-bff --template with-plugins

已使用 "with-plugins" 模板创建 acme-bff。

下一步：
  cd acme-bff
  bun install
  bun run dev`,
      'cli.shapeLabel': '模板结构',
      'cli.shapeCode': `acme-bff/
  src/
    main.ts
  package.json
  README.md
  .env.example`,
      'cli.templatesLabel': '模板',
      'cli.basic': '只包含 core 内置能力的最小可用应用。',
      'cli.plugins': '内含 auth、cache、metrics、rate limit、options 和一个自定义插件路由。',
      'cli.forward': '包含 forward 规则，以及请求/响应 hook 示例。',
      'examplesHome.eyebrow': '可运行路径',
      'examplesHome.title': '从产品定位直接跳到具体、可运行的示例。',
      'examplesHome.basic.title': '仅 core',
      'examplesHome.basic.body':
        '当你只想从最小可用应用形状开始时，用 health 和 options 即可。',
      'examplesHome.plugins.title': '运维型扩展',
      'examplesHome.plugins.body':
        '在一个应用壳里直接看到 auth、cache、metrics、rate limiting、request logging 和 options 的组合。',
      'examplesHome.forward.title': 'Forward 与 hook 流程',
      'examplesHome.forward.body':
        '当 BFF 需要控制上游请求时，使用请求/响应 hooks 和 transport-aware forwarding。',
      'examplesHome.async.title': '异步启动',
      'examplesHome.async.body':
        '当插件初始化在应用 ready 之前就需要异步工作时，使用 `createApp()`。',
      'opsHome.eyebrow': 'Transport 与运维',
      'opsHome.title': '运行时虽然精简，但运维表面仍然是有意识设计过的。',
      'opsHome.body':
        '`humming` 把 `forward` 放在 core 里，是因为上游控制本来就是 BFF 的真实关切。这也意味着 transport 策略、上线边界、回归基线和可观测性应该有一套一等公民级别的说明，而不是散落在备注里。',
      'opsHome.transport.title': 'Transport',
      'opsHome.transport.body':
        '在基础 fetch、keepalive 导向 fetch、带重试 fetch 和自定义 transport 合约之间做选择。',
      'opsHome.production.title': 'Production',
      'opsHome.production.body':
        '阅读部署模型、forward 安全边界、metrics 指导，以及 cache 与 auth 的使用边界。',
      'opsHome.benchmark.title': 'Benchmark',
      'opsHome.benchmark.body':
        '在修改运行时行为之前，先对比直连上游和 forward 后流量的差异。',
      'opsHome.roadmap.title': 'Roadmap',
      'opsHome.roadmap.body':
        '查看 plugin lifecycle、observability 和更广的平台成熟度接下来会往哪里走。',
      'docs.eyebrow': '文档',
      'docs.title': '从最适合当前任务的入口开始。',
      'docs.portal.title': '文档入口',
      'docs.portal.body': '统一进入 overview、plugin system、CLI、transport、production 和 benchmark 指南。',
      'docs.overview.title': 'Overview',
      'docs.overview.body': '项目定位、架构边界，以及 core 为什么应该保持精简。',
      'docs.transport.title': 'Transport',
      'docs.transport.body': 'keepalive、retry policy 和自定义 transport 策略边界。',
      'docs.cli.title': 'CLI',
      'docs.cli.body': '使用 Bun 风格脚手架模板快速创建新项目。',
      'signals.eyebrow': '运行时信号',
      'signals.title': '小运行时不代表必须是黑盒运行时。',
      'signals.body':
        '`humming` 想保持精简，但不希望团队在排查时只能摸黑。启动摘要、forward timings、hook ownership、transport 策略和插件 cleanup 都应该随着应用增长继续保持可见。',
      'signals.cardOne.title': '启动摘要',
      'signals.cardOne.body': '看到哪些插件被启用，以及它们在 setup 阶段各自注册了什么。',
      'signals.cardTwo.title': 'Forward 分阶段耗时',
      'signals.cardTwo.body': '把匹配、hooks、上游执行和错误处理拆成独立 timing phases。',
      'signals.cardThree.title': 'Hook 归属',
      'signals.cardThree.body': '跟踪这次请求里哪些插件贡献了 active 的 forward hook 链。',
      'signals.cardFour.title': '显式 teardown',
      'signals.cardFour.body':
        '让插件资源在关闭时被干净释放，而不是把 timer、client 和共享句柄泄漏到 shutdown 过程里。',
      'final.eyebrow': '从这里开始',
      'final.title': '如果你的团队需要一个边界清晰的薄 BFF，这里就是入口。',
      'final.body':
        '先读文档、看示例，再用脚手架起一个 starter app。这个项目刻意保持足够小，希望你在一天之内就能看懂运行时。',
      'final.ctaDocs': '打开文档入口',
      'final.ctaCli': '查看 CLI 指南',
      'final.ctaRepo': '浏览仓库',
      'footer.tagline': 'humming 是一个面向 Bun 的插件优先轻量 BFF 内核。',
      'footer.docs': '文档',
      'footer.readme': 'README',
      'footer.github': 'GitHub',
    },
  },
  docs: {
    en: {
      'meta.title': 'humming Docs',
      'meta.description':
        'Documentation entry for humming: overview, plugin system, CLI, transport, production, benchmark, and plugin authoring guides.',
      'brand.homeAria': 'humming home',
      'brand.docs': 'humming docs',
      'lang.switchLabel': 'Language switch',
      'nav.home': 'Home',
      'nav.tracks': 'Tracks',
      'nav.examples': 'Examples',
      'nav.ops': 'Ops',
      'nav.readme': 'README',
      'nav.github': 'GitHub',
      'hero.eyebrow': 'Documentation entry',
      'hero.title': 'Find the shortest path from evaluation to implementation.',
      'hero.lede':
        'This page is the entry point for the current `humming` docs set. The detailed guides still live in Markdown so they stay close to the codebase and version history.',
      'hero.pathsLabel': 'Recommended reading paths',
      'hero.pathOne':
        '<strong>Evaluating humming:</strong> overview → README → plugin system',
      'hero.pathTwo':
        '<strong>Starting a new app:</strong> CLI → examples → production',
      'hero.pathThree':
        '<strong>Tuning forward:</strong> transport → benchmark → production',
      'hero.pathFour':
        '<strong>Building extensions:</strong> plugin system → plugin guide',
      'tracks.eyebrow': 'Reading tracks',
      'tracks.title': 'Pick the path that matches the job in front of you.',
      'tracks.evaluate.token': 'evaluate',
      'tracks.evaluate.title': 'Assess fit first',
      'tracks.evaluate.body':
        'Start with positioning and boundaries before reading implementation details.',
      'tracks.start.token': 'start',
      'tracks.start.title': 'Launch a new app',
      'tracks.start.body':
        'Use the CLI, inspect examples, then move into production guidance once the shape is clear.',
      'tracks.extend.token': 'extend',
      'tracks.extend.title': 'Build plugins and hooks',
      'tracks.extend.body':
        'Understand the plugin model first, then drop to the authoring guide and forward hooks.',
      'tracks.operate.token': 'operate',
      'tracks.operate.title': 'Prepare for rollout',
      'tracks.operate.body':
        'Focus on transport policy, production guidance, local benchmarks, and the current roadmap.',
      'core.eyebrow': 'Core guides',
      'core.title': 'Read the architecture and runtime boundaries first.',
      'core.overview.title': 'Overview',
      'core.overview.body':
        'Positioning, architecture, core boundaries, and when `humming` is the right fit.',
      'core.plugin.title': 'Plugin system',
      'core.plugin.body':
        'Extension model, governance direction, execution order, and growth strategy.',
      'core.transport.title': 'Transport',
      'core.transport.body':
        'Forward transport strategies, keepalive, retry policy, and custom transport hooks.',
      'core.production.title': 'Production',
      'core.production.body':
        'Runtime setup, operational concerns, and how to keep the service predictable.',
      'tooling.eyebrow': 'Tooling guides',
      'tooling.title':
        'Use the CLI and benchmark docs when you want to move quickly.',
      'tooling.cli.title': 'CLI',
      'tooling.cli.body':
        'Scaffold apps from templates and standardize local project bootstrapping.',
      'tooling.benchmark.title': 'Benchmark',
      'tooling.benchmark.body':
        'Measure the forward baseline and compare direct upstream calls with proxied traffic.',
      'tooling.guide.title': 'Plugin guide',
      'tooling.guide.body':
        'Code-level authoring details, examples, and patterns for building custom plugins.',
      'tooling.readme.title': 'Repository README',
      'tooling.readme.body':
        'Main project landing page with quick start, official plugins, and examples.',
      'examples.eyebrow': 'Examples',
      'examples.title': 'Map the docs to runnable templates.',
      'examples.body':
        'The examples folder is the fastest way to move from concepts to a running app. Use the matching example after each guide instead of trying to absorb everything at once.',
      'ops.eyebrow': 'Operational depth',
      'ops.title':
        'When the question is operational, follow the transport-to-rollout path.',
      'ops.body':
        '`humming` is small, but the forward path, startup summaries, plugin lifecycle, and production boundaries still deserve deliberate reading. This set is the shortest way to get there.',
      'ops.transport.title': 'Transport policy',
      'ops.transport.body':
        'Understand retry, keepalive, custom transport boundaries, and route-level selection.',
      'ops.production.title': 'Production guide',
      'ops.production.body':
        'Review deployment shape, auth, cache, logging, metrics, and forward safety expectations.',
      'ops.benchmark.title': 'Benchmark workflow',
      'ops.benchmark.body':
        'Use the local forward benchmark as a regression signal before changing transport behavior.',
      'ops.roadmap.title': 'Roadmap',
      'ops.roadmap.body':
        'See which maturity gaps are being closed now and which areas intentionally wait.',
      'footer.tagline':
        'Detailed docs live in versioned Markdown files inside this repository.',
      'footer.home': 'Home',
      'footer.readme': 'README',
      'footer.docsFolder': 'Docs Folder',
    },
    zh: {
      'meta.title': 'humming 文档入口',
      'meta.description':
        'humming 的文档入口：overview、plugin system、CLI、transport、production、benchmark 与插件编写指南。',
      'brand.homeAria': 'humming 首页',
      'brand.docs': 'humming 文档',
      'lang.switchLabel': '语言切换',
      'nav.home': '首页',
      'nav.tracks': '路径',
      'nav.examples': '示例',
      'nav.ops': '运维',
      'nav.readme': 'README',
      'nav.github': 'GitHub',
      'hero.eyebrow': '文档入口',
      'hero.title': '从评估到落地，找到最短阅读路径。',
      'hero.lede':
        '这个页面是当前 `humming` 文档集合的统一入口。详细指南依然保留在 Markdown 里，方便和代码版本一起演进。',
      'hero.pathsLabel': '推荐阅读路径',
      'hero.pathOne':
        '<strong>评估 humming：</strong>overview → README → plugin system',
      'hero.pathTwo':
        '<strong>启动新项目：</strong>CLI → examples → production',
      'hero.pathThree':
        '<strong>调优 forward：</strong>transport → benchmark → production',
      'hero.pathFour':
        '<strong>开发扩展：</strong>plugin system → plugin guide',
      'tracks.eyebrow': '阅读路径',
      'tracks.title': '按你当前要解决的任务来选路径。',
      'tracks.evaluate.token': '评估',
      'tracks.evaluate.title': '先判断是否适合',
      'tracks.evaluate.body': '先看定位和边界，再深入实现细节。',
      'tracks.start.token': '启动',
      'tracks.start.title': '开始一个新应用',
      'tracks.start.body': '先用 CLI，再看 examples，等应用形状明确后再进入 production 指南。',
      'tracks.extend.token': '扩展',
      'tracks.extend.title': '开发插件和 hooks',
      'tracks.extend.body': '先理解插件模型，再进入 authoring guide 和 forward hooks。',
      'tracks.operate.token': '运维',
      'tracks.operate.title': '为上线做准备',
      'tracks.operate.body': '把重点放在 transport 策略、production 指导、本地 benchmark 和当前 roadmap。',
      'core.eyebrow': '核心指南',
      'core.title': '先读架构边界和运行时边界。',
      'core.overview.title': 'Overview',
      'core.overview.body':
        '项目定位、架构边界，以及在什么情况下 `humming` 是合适选择。',
      'core.plugin.title': 'Plugin system',
      'core.plugin.body':
        '扩展模型、治理方向、执行顺序，以及后续生态增长方式。',
      'core.transport.title': 'Transport',
      'core.transport.body':
        'forward transport 策略、keepalive、retry policy 与自定义 transport hooks。',
      'core.production.title': 'Production',
      'core.production.body': '运行时部署、运维关注点，以及如何让服务保持可预测。',
      'tooling.eyebrow': '工具链指南',
      'tooling.title': '想快速推进时，优先看 CLI 和 benchmark 文档。',
      'tooling.cli.title': 'CLI',
      'tooling.cli.body': '通过模板脚手架快速初始化项目，并统一本地启动方式。',
      'tooling.benchmark.title': 'Benchmark',
      'tooling.benchmark.body': '测量 forward 基线，对比直连上游与代理流量表现。',
      'tooling.guide.title': 'Plugin guide',
      'tooling.guide.body': '插件编写的代码级细节、示例与实践模式。',
      'tooling.readme.title': 'Repository README',
      'tooling.readme.body': '项目主入口，包含 quick start、官方插件和示例说明。',
      'examples.eyebrow': '示例',
      'examples.title': '把文档和可运行模板对应起来。',
      'examples.body':
        '从概念到运行中的应用，最快的方式就是 examples 目录。每看完一类指南，就去跑对应示例，而不是一次性硬读完整套文档。',
      'ops.eyebrow': '运维深度',
      'ops.title': '当问题偏运维时，沿着 transport 到 rollout 这条路径读下去。',
      'ops.body':
        '`humming` 虽然小，但 forward 路径、启动摘要、插件生命周期和 production 边界依然值得被刻意阅读。这组内容就是最短路径。',
      'ops.transport.title': 'Transport 策略',
      'ops.transport.body':
        '理解 retry、keepalive、自定义 transport 边界，以及按路由选择 transport 的方式。',
      'ops.production.title': 'Production 指南',
      'ops.production.body':
        '查看部署形态、auth、cache、logging、metrics 和 forward safety 的预期边界。',
      'ops.benchmark.title': 'Benchmark 工作流',
      'ops.benchmark.body': '在修改 transport 行为之前，先把本地 forward benchmark 当作回归信号来用。',
      'ops.roadmap.title': 'Roadmap',
      'ops.roadmap.body': '查看哪些成熟度缺口正在补，哪些能力被有意延后。',
      'footer.tagline': '详细文档仍然以版本化 Markdown 文件形式保存在仓库中。',
      'footer.home': '首页',
      'footer.readme': 'README',
      'footer.docsFolder': '文档目录',
    },
  },
};

const page = document.body.dataset.page;
const buttons = Array.from(document.querySelectorAll('[data-lang-switch]'));

function getInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (SUPPORTED_LANGS.has(urlLang)) {
    return urlLang;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (SUPPORTED_LANGS.has(stored)) {
    return stored;
  }

  const browser = (navigator.language || DEFAULT_LANG).toLowerCase();
  return browser.startsWith('zh') ? 'zh' : DEFAULT_LANG;
}

function getDictionary(lang) {
  const pageTranslations = translations[page];
  if (!pageTranslations) {
    return {};
  }

  return pageTranslations[lang] || pageTranslations[DEFAULT_LANG] || {};
}

function applyLanguage(lang) {
  const dictionary = getDictionary(lang);

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const value = dictionary[key];

    if (typeof value !== 'string') {
      return;
    }

    const attr = element.dataset.i18nAttr;
    if (attr) {
      element.setAttribute(attr, value);
      return;
    }

    if (element.dataset.i18nMode === 'html') {
      element.innerHTML = value;
      return;
    }

    element.textContent = value;
  });

  buttons.forEach((button) => {
    const isActive = button.dataset.langSwitch === lang;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  window.localStorage.setItem(STORAGE_KEY, lang);
}

const initialLanguage = getInitialLanguage();
applyLanguage(initialLanguage);

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextLang = button.dataset.langSwitch;
    if (SUPPORTED_LANGS.has(nextLang)) {
      applyLanguage(nextLang);
    }
  });
});
