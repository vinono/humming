// effects.js - Interactive features for humming promo page

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initSpotlightEffects();
  initHeroTabs();
  initBffSimulator();
  initPluginConfigurator();
  initCliTerminal();
  listenToLangChanges();
});

// Scroll Animations
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  // 为每个动画区域内的子卡片计算并添加交错延迟，以实现优雅的渐进式入场效果
  animatedElements.forEach((section) => {
    const children = section.querySelectorAll(
      '.feature-card, .core-card, .compare-card, .signal-card, .use-case-card, .plugin-card, .doc-card, article'
    );
    children.forEach((child, index) => {
      child.style.transitionDelay = `${index * 80}ms`;
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  animatedElements.forEach((el) => observer.observe(el));
}

// Mouse Spotlight Hover Effect
function initSpotlightEffects() {
  const cards = document.querySelectorAll('.spotlight-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// Hero Tabs Management
function initHeroTabs() {
  const tabs = document.querySelectorAll('.hero-tab-btn');
  const panels = document.querySelectorAll('.hero-panel-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.tab;
      
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => p.classList.remove('is-active'));

      tab.classList.add('is-active');
      const panelEl = document.getElementById(`hero-panel-${targetPanel}`);
      if (panelEl) panelEl.classList.add('is-active');
    });
  });
}

// Interactive BFF Request Simulator
let cacheStore = {};
function initBffSimulator() {
  const sendBtn = document.getElementById('sim-send-btn');
  const clearBtn = document.getElementById('sim-clear-btn');
  const routeSelect = document.getElementById('sim-route-select');
  const consoleBody = document.getElementById('sim-console-body');
  
  const clientNode = document.getElementById('node-client');
  const pluginsNode = document.getElementById('node-plugins');
  const coreNode = document.getElementById('node-core');
  const upstreamNode = document.getElementById('node-upstream');

  const line1 = document.getElementById('line-client-plugins');
  const line2 = document.getElementById('line-plugins-core');
  const line3 = document.getElementById('line-core-upstream');

  if (!sendBtn || !consoleBody) return;

  // Clear logs
  clearBtn.addEventListener('click', () => {
    consoleBody.innerHTML = '';
    cacheStore = {};
    addLog('system', 'Console cleared. Memory cache reset.');
  });

  function addLog(source, msg) {
    const p = document.createElement('p');
    p.className = `log-line log-${source}`;
    const time = new Date().toLocaleTimeString().split(' ')[0];
    p.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-tag">[${source}]</span> ${msg}`;
    consoleBody.appendChild(p);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  // Animation helper
  function pulseNode(node, duration = 600) {
    node.classList.add('pulse-active');
    setTimeout(() => node.classList.remove('pulse-active'), duration);
  }

  function animateLine(line, forward = true, duration = 400) {
    line.classList.remove('anim-forward', 'anim-backward');
    // trigger reflow
    void line.offsetWidth;
    line.classList.add(forward ? 'anim-forward' : 'anim-backward');
    setTimeout(() => {
      line.classList.remove('anim-forward', 'anim-backward');
    }, duration);
  }

  sendBtn.addEventListener('click', async () => {
    if (sendBtn.disabled) return;
    sendBtn.disabled = true;
    routeSelect.disabled = true;

    const route = routeSelect.value;
    const isZH = document.documentElement.lang.startsWith('zh');
    
    addLog('client', isZH ? `发起请求: GET ${route}` : `Sending request: GET ${route}`);
    
    // Client -> Plugins
    pulseNode(clientNode);
    animateLine(line1, true, 400);
    await delay(400);

    pulseNode(pluginsNode);
    
    // Plugins processing
    if (route === '/api/users') {
      addLog('plugin-auth', isZH ? '正在校验 Bearer Token...' : 'Verifying Bearer Token...');
      await delay(300);
      addLog('plugin-auth', isZH ? 'Token 校验通过 (User: admin)' : 'Token verified (User: admin)');
      await delay(200);

      // Check Cache
      if (cacheStore['/api/users']) {
        addLog('plugin-cache', isZH ? '命中内存缓存! 立即返回响应。' : 'Cache HIT! Returning response immediately.');
        pulseNode(pluginsNode);
        animateLine(line1, false, 400);
        await delay(400);
        pulseNode(clientNode);
        addLog('client', isZH ? '收到响应: 200 OK (来自缓存, 耗时: 1ms)' : 'Received response: 200 OK (from cache, 1ms)');
        addLog('client', `JSON: {"users":[{"id":1,"name":"Alice"}]}`);
        sendBtn.disabled = false;
        routeSelect.disabled = false;
        return;
      } else {
        addLog('plugin-cache', isZH ? '缓存未命中，需要转发上游...' : 'Cache MISS. Forwarding required...');
        await delay(200);
      }
    } else if (route === '/options') {
      addLog('plugin-options', isZH ? '加载静态字典与选项配置...' : 'Loading static dictionaries and configuration options...');
      await delay(350);
    }

    // Plugins -> Core
    animateLine(line2, true, 400);
    await delay(400);
    pulseNode(coreNode);
    addLog('core', isZH ? `匹配路由规则，执行 forward 链路...` : `Matching route rules, starting forward flow...`);
    await delay(300);

    if (route === '/health') {
      // Core directly responds (built-in health bypasses plugins and forward)
      addLog('core', isZH ? '内置 health 接口，直接返回 200 OK' : 'Built-in health endpoint, responding with 200 OK');
      animateLine(line2, false, 400);
      await delay(400);
      pulseNode(pluginsNode);
      animateLine(line1, false, 400);
      await delay(400);
      pulseNode(clientNode);
      addLog('client', isZH ? '收到响应: 200 OK (耗时: 8ms) {"status":"ok"}' : 'Received response: 200 OK (8ms) {"status":"ok"}');
    } 
    else if (route === '/options') {
      // Core responds options data
      addLog('core', isZH ? '组合静态 options 数据并响应' : 'Aggregating options payload and responding');
      animateLine(line2, false, 400);
      await delay(400);
      pulseNode(pluginsNode);
      animateLine(line1, false, 400);
      await delay(400);
      pulseNode(clientNode);
      addLog('client', isZH ? '收到响应: 200 OK (耗时: 12ms)' : 'Received response: 200 OK (12ms)');
      addLog('client', `JSON: {"status":200,"countries":["CN","US"],"languages":["zh","en"]}`);
    } 
    else if (route === '/api/users') {
      // Core -> Upstream
      addLog('core-forward', isZH ? '正在转发请求至上游: https://api.internal/users' : 'Forwarding request to upstream: https://api.internal/users');
      animateLine(line3, true, 400);
      await delay(400);
      
      pulseNode(upstreamNode);
      addLog('upstream', isZH ? '上游接收请求，正在查询数据库...' : 'Upstream received request, querying database...');
      await delay(400);
      addLog('upstream', isZH ? '响应 200 OK，包含 JSON 载荷' : 'Responding 200 OK with JSON payload');
      
      // Upstream -> Core
      animateLine(line3, false, 400);
      await delay(400);
      pulseNode(coreNode);
      
      addLog('core-forward', isZH ? '上游响应已接收。进入插件 response 钩子链...' : 'Upstream response received. Executing plugins response hooks...');
      await delay(300);

      // Core -> Plugins
      animateLine(line2, false, 400);
      await delay(400);
      pulseNode(pluginsNode);
      
      // Plugins write cache
      cacheStore['/api/users'] = true;
      addLog('plugin-cache', isZH ? '已将上游响应保存到内存缓存(TTL: 60s)' : 'Saved upstream response to memory cache (TTL: 60s)');
      await delay(200);

      // Plugins -> Client
      animateLine(line1, false, 400);
      await delay(400);
      pulseNode(clientNode);

      addLog('client', isZH ? '收到响应: 200 OK (耗时: 135ms)' : 'Received response: 200 OK (135ms)');
      addLog('client', `JSON: {"users":[{"id":1,"name":"Alice"}]}`);
    }

    sendBtn.disabled = false;
    routeSelect.disabled = false;
  });
}

// Plugin Configurator Widget
const codeTemplates = {
  auth: {
    import: `import { auth } from "humming/plugins/auth";`,
    setup: `  // 1. Authenticate routes
  app.use(auth({
    secret: process.env.JWT_SECRET || "default-secret",
    exclude: ["/health", "/options"]
  }));`
  },
  cache: {
    import: `import { cache } from "humming/plugins/cache";`,
    setup: `  // 2. Cache responses in memory
  app.use(cache({
    ttl: 60 * 1000, // 1 min cache
    routes: ["/api/users"]
  }));`
  },
  metrics: {
    import: `import { metrics } from "humming/plugins/metrics";`,
    setup: `  // 3. Expose Prometheus metrics
  app.use(metrics({
    endpoint: "/metrics"
  }));`
  },
  ratelimit: {
    import: `import { rateLimit } from "humming/plugins/rate-limit";`,
    setup: `  // 4. Protect against abuse
  app.use(rateLimit({
    limit: 100,
    window: "1m"
  }));`
  },
  cors: {
    import: `import { cors } from "humming/plugins/cors";`,
    setup: `  // 5. Handle browser CORS preflight
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"]
  }));`
  },
  options: {
    import: `import { options } from "humming/plugins/options";`,
    setup: `  // 6. Serve static configuration endpoints
  app.use(options({
    sources: {
      regions: ["ap-east-1", "ap-southeast-1"]
    }
  }));`
  }
};

function generateConfigCode(selectedPlugins) {
  const imports = [];
  const setups = [];

  selectedPlugins.forEach(p => {
    if (codeTemplates[p]) {
      imports.push(codeTemplates[p].import);
      setups.push(codeTemplates[p].setup);
    }
  });

  const importStr = imports.length > 0 ? imports.join('\n') + '\n' : '';
  const setupStr = setups.length > 0 ? setups.join('\n\n') + '\n' : '';

  let code = `import { humming } from "humming";
${importStr}
const app = humming({
  port: 3000
});
\n${setupStr}
// Built-in forwarding handler
app.forward("/api/*", {
  target: "https://api.upstream.internal",
  headers: {
    "X-Forwarded-By": "humming-bff"
  }
});

export default app;`;

  return highlightCode(code);
}

function highlightCode(code) {
  // Simple syntax highlighter
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\b(const|let|import|from|export|default)\b/g, '<span class="tok-keyword">$1</span>')
    .replace(/\b(humming|auth|cache|metrics|rateLimit|cors|options)\b/g, '<span class="tok-func">$1</span>')
    .replace(/(["'`])(.*?)\1/g, '<span class="tok-string">"$2"</span>')
    .replace(/(\/\/.*)/g, '<span class="tok-comment">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="tok-number">$1</span>');
}

function initPluginConfigurator() {
  const checkboxes = document.querySelectorAll('.plugin-config-checkbox');
  const codeBlock = document.getElementById('configurator-code-block');

  if (!codeBlock) return;

  function updateCode() {
    const selected = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        selected.push(cb.value);
      }
    });
    codeBlock.innerHTML = generateConfigCode(selected);
  }

  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateCode);
  });

  // Initial load
  updateCode();
}

// Interactive CLI showcase terminal
const cliOutputs = {
  init: {
    cmd: 'bunx humming init my-bff --template with-plugins',
    lines: [
      '<span class="tok-comment"># Initializing humming project...</span>',
      '<span class="tok-keyword">✔</span> Scaffolding directory structure',
      '<span class="tok-keyword">✔</span> Generating package.json, main.ts, .env.example',
      '<span class="tok-keyword">✔</span> Setup complete!',
      '',
      'Next steps:',
      '  <span class="tok-string">cd my-bff</span>',
      '  <span class="tok-string">bun install</span>',
      '  <span class="tok-string">bun run dev</span>'
    ]
  },
  dev: {
    cmd: 'bun run dev',
    lines: [
      '<span class="tok-keyword">[humming]</span> Starting BFF core in watch mode...',
      '<span class="tok-keyword">[humming]</span> Loader initialized successfully.',
      '<span class="tok-keyword">[humming]</span> <span class="tok-func">Enabled Plugins:</span> auth, cache, metrics, options',
      '<span class="tok-keyword">[humming]</span> <span class="tok-func">Routes Registered:</span>',
      '  GET  /health      (built-in)',
      '  GET  /options     (plugin:options)',
      '  GET  /metrics     (plugin:metrics)',
      '  ANY  /api/*       (forward rules active)',
      '<span class="tok-keyword">[humming]</span> Server running at <span class="tok-string">http://localhost:3000</span>'
    ]
  },
  build: {
    cmd: 'bun run build',
    lines: [
      '<span class="tok-comment"># Compiling humming BFF app for Bun...</span>',
      '<span class="tok-keyword">✔</span> Type checking with tsc',
      '<span class="tok-keyword">✔</span> Resolving dependencies',
      '<span class="tok-keyword">✔</span> Bundling target assets into ./dist/index.js',
      '<span class="tok-keyword">[build]</span> Size: <span class="tok-string">18.5 KB</span>',
      '<span class="tok-keyword">✔</span> Build complete. Ready for production rollout!'
    ]
  }
};

function initCliTerminal() {
  const tabs = document.querySelectorAll('.cli-tab-btn');
  const codeBody = document.getElementById('cli-terminal-body');
  const btnRun = document.getElementById('cli-btn-run');
  const btnCopy = document.getElementById('cli-btn-copy');

  if (!codeBody || !btnRun) return;

  let activeCommand = 'init';
  let isTyping = false;

  function updateCopyButtonText(isZH) {
    if (btnCopy) {
      btnCopy.textContent = isZH ? '复制' : 'Copy';
    }
  }

  // Handle run simulation
  async function runCommand() {
    if (isTyping) return;
    isTyping = true;
    btnRun.disabled = true;
    
    codeBody.innerHTML = '';
    const output = cliOutputs[activeCommand];

    // Show prompt
    const promptLine = document.createElement('div');
    promptLine.className = 'cli-line-prompt';
    promptLine.innerHTML = `<span class="cli-prompt-symbol">$</span> <span class="cli-typing-text"></span>`;
    codeBody.appendChild(promptLine);

    const typingSpan = promptLine.querySelector('.cli-typing-text');
    const fullCmd = output.cmd;
    
    // Type out command letter by letter
    for (let i = 0; i < fullCmd.length; i++) {
      typingSpan.textContent += fullCmd[i];
      await delay(25);
    }
    
    await delay(300);

    // Print output lines
    for (let line of output.lines) {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'cli-line-output';
      lineDiv.innerHTML = line;
      codeBody.appendChild(lineDiv);
      codeBody.scrollTop = codeBody.scrollHeight;
      await delay(80);
    }

    isTyping = false;
    btnRun.disabled = false;
  }

  // Handle Tab Switch
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (isTyping) return;
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      activeCommand = tab.dataset.cliCmd;
      
      // Reset terminal content to simple preview
      codeBody.innerHTML = `<span class="tok-comment"># Click "Run Command" to simulate</span>\n$ ${cliOutputs[activeCommand].cmd}`;
    });
  });

  // Run initial state
  btnRun.addEventListener('click', runCommand);

  // Copy command
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const cmdText = cliOutputs[activeCommand].cmd;
      navigator.clipboard.writeText(cmdText).then(() => {
        const isZH = document.documentElement.lang.startsWith('zh');
        btnCopy.textContent = isZH ? '已复制!' : 'Copied!';
        setTimeout(() => {
          updateCopyButtonText(isZH);
        }, 1500);
      });
    });
  }
}

// Watch lang switches to reset dynamic text state
function listenToLangChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
        const isZH = document.documentElement.lang.startsWith('zh');
        
        // Reset CLI Copy button text
        const btnCopy = document.getElementById('cli-btn-copy');
        if (btnCopy) {
          btnCopy.textContent = isZH ? '复制' : 'Copy';
        }

        // Reset CLI Run button text
        const btnRun = document.getElementById('cli-btn-run');
        if (btnRun) {
          btnRun.textContent = isZH ? '运行命令' : 'Run Command';
        }

        // Reset Simulator Send button text
        const sendBtn = document.getElementById('sim-send-btn');
        if (sendBtn) {
          sendBtn.textContent = isZH ? '发送请求' : 'Send Request';
        }

        // Reset Simulator Clear button text
        const clearBtn = document.getElementById('sim-clear-btn');
        if (clearBtn) {
          clearBtn.textContent = isZH ? '清空日志' : 'Clear Logs';
        }
      }
    });
  });

  observer.observe(document.documentElement, { attributes: true });
}

// Utilities
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
