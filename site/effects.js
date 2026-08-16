// effects.js - Interactive features for the Endel-style Humming landing page

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCliCopy();
  initCodePlayground();
  initModeSwitcher();
  initPipelineSimulator();
  initTerminalTabs();
});

// Scroll Animations
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  animatedElements.forEach((el, index) => {
    el.style.transitionDelay = `${(index % 4) * 90}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.08 }
  );

  animatedElements.forEach((el) => observer.observe(el));
}

// Quick CLI Command Copy
function initCliCopy() {
  const copyPill = document.querySelector('.cli-quick-pill');
  if (!copyPill) return;

  copyPill.addEventListener('click', async () => {
    const textToCopy = copyPill.getAttribute('data-copy-text') || 'bunx humming init my-bff';
    try {
      await navigator.clipboard.writeText(textToCopy);
      const textSpan = copyPill.querySelector('.cli-code-text');
      const originalText = textSpan.textContent;
      
      textSpan.textContent = '✓ Copied!';
      copyPill.style.borderColor = 'var(--accent-emerald)';
      copyPill.style.color = 'var(--accent-emerald)';

      setTimeout(() => {
        textSpan.textContent = originalText;
        copyPill.style.borderColor = '';
        copyPill.style.color = '';
      }, 2000);
    } catch (_) {
      // Fallback
    }
  });
}

// Interactive Code Playground (Hero Option A)
function initCodePlayground() {
  const tabs = document.querySelectorAll('.pg-tab');
  const codeDisplay = document.getElementById('pg-code-display');
  const reqPathDisplay = document.getElementById('pg-req-path');
  const responseJsonDisplay = document.getElementById('pg-response-json');
  const runBtn = document.getElementById('btn-pg-run');
  const latencyStat = document.getElementById('pg-latency-stat');

  if (!tabs.length || !codeDisplay) return;

  const presets = {
    fast: {
      code: `<span class="token-keyword">import</span> { createApp } <span class="token-keyword">from</span> <span class="token-string">'humming'</span>;

<span class="token-keyword">const</span> app = <span class="token-func">createApp</span>({
  port: <span class="token-number">8788</span>,
  routes: {
    <span class="token-string">'/health'</span>: () => ({ status: <span class="token-string">'ok'</span>, uptime: process.<span class="token-func">uptime</span>() }),
    <span class="token-string">'/api/options'</span>: { teams: [<span class="token-string">'Core'</span>, <span class="token-string">'Platform'</span>, <span class="token-string">'UI'</span>] }
  }
});

app.<span class="token-func">listen</span>();`,
      path: 'http://localhost:8788/health',
      json: `<span class="json-brace">{</span>
  <span class="json-key">"status"</span>: <span class="json-str">"healthy"</span>,
  <span class="json-key">"runtime"</span>: <span class="json-str">"bun-1.3.11"</span>,
  <span class="json-key">"uptime"</span>: <span class="json-num">14.28</span>,
  <span class="json-key">"proxy_overhead"</span>: <span class="json-str">"&lt; 0.4ms"</span>,
  <span class="json-key">"zero_copy"</span>: <span class="json-bool">true</span>
<span class="json-brace">}</span>`
    },
    plugins: {
      code: `<span class="token-keyword">import</span> { createApp } <span class="token-keyword">from</span> <span class="token-string">'humming'</span>;
<span class="token-keyword">import</span> { authPlugin } <span class="token-keyword">from</span> <span class="token-string">'@humming/auth'</span>;
<span class="token-keyword">import</span> { cachePlugin } <span class="token-keyword">from</span> <span class="token-string">'@humming/cache'</span>;

<span class="token-keyword">const</span> app = <span class="token-func">createApp</span>()
  .<span class="token-func">use</span>(<span class="token-func">authPlugin</span>({ jwksUri: <span class="token-string">'https://auth.company.io/jwks'</span> }))
  .<span class="token-func">use</span>(<span class="token-func">cachePlugin</span>({ ttl: <span class="token-number">60</span>, redis: process.env.REDIS_URL }));

app.<span class="token-func">listen</span>(<span class="token-number">8788</span>);`,
      path: 'http://localhost:8788/api/user/profile',
      json: `<span class="json-brace">{</span>
  <span class="json-key">"auth"</span>: <span class="json-str">"verified"</span>,
  <span class="json-key">"claims"</span>: <span class="json-brace">{</span> <span class="json-key">"sub"</span>: <span class="json-str">"user_9842"</span>, <span class="json-key">"role"</span>: <span class="json-str">"engineer"</span> <span class="json-brace">}</span>,
  <span class="json-key">"cache_hit"</span>: <span class="json-bool">true</span>,
  <span class="json-key">"cache_ttl_remaining"</span>: <span class="json-num">58</span>
<span class="json-brace">}</span>`
    },
    forward: {
      code: `<span class="token-keyword">import</span> { createApp } <span class="token-keyword">from</span> <span class="token-string">'humming'</span>;

<span class="token-keyword">const</span> app = <span class="token-func">createApp</span>({
  forward: {
    <span class="token-string">'/api/v1/*'</span>: {
      target: <span class="token-string">'https://upstream-cluster.internal'</span>,
      timeout: <span class="token-number">1500</span>,
      retries: <span class="token-number">2</span>,
      headers: { <span class="token-string">'x-bff-version'</span>: <span class="token-string">'0.1.0'</span> }
    }
  }
});

app.<span class="token-func">listen</span>(<span class="token-number">8788</span>);`,
      path: 'http://localhost:8788/api/v1/stream/orders',
      json: `<span class="json-brace">{</span>
  <span class="json-key">"upstream_status"</span>: <span class="json-num">200</span>,
  <span class="json-key">"transport"</span>: <span class="json-str">"zero-copy-stream"</span>,
  <span class="json-key">"stream_bytes"</span>: <span class="json-num">482910</span>,
  <span class="json-key">"retry_attempts"</span>: <span class="json-num">0</span>
<span class="json-brace">}</span>`
    }
  };

  let activeTabKey = 'fast';

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabKey = tab.getAttribute('data-pg-tab');
      if (!presets[tabKey]) return;

      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      activeTabKey = tabKey;

      codeDisplay.innerHTML = presets[tabKey].code;
      reqPathDisplay.textContent = presets[tabKey].path;
      responseJsonDisplay.innerHTML = presets[tabKey].json;

      // Pulse animation
      triggerResponsePulse();
    });
  });

  function triggerResponsePulse() {
    responseJsonDisplay.style.opacity = '0.3';
    setTimeout(() => {
      responseJsonDisplay.style.opacity = '1';
      const randomLatency = (0.32 + Math.random() * 0.15).toFixed(2);
      if (latencyStat) latencyStat.textContent = `${randomLatency} ms`;
    }, 150);
  }

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runBtn.style.transform = 'scale(0.95)';
      setTimeout(() => (runBtn.style.transform = ''), 150);
      triggerResponsePulse();
    });
  }
}

// Mode Switcher synchronization (Mode Cards)
function initModeSwitcher() {
  const modeCards = document.querySelectorAll('.mode-card');

  modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      modeCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
    });
  });
}

// Live Request Pipeline Simulator
function initPipelineSimulator() {
  const triggerBtn = document.getElementById('pipeline-trigger-btn');
  const routeChips = document.querySelectorAll('.route-chip');
  const consoleBox = document.getElementById('pipeline-terminal-box');

  const nodeClient = document.getElementById('node-client');
  const nodePlugin = document.getElementById('node-plugin');
  const nodeCore = document.getElementById('node-core');
  const nodeUpstream = document.getElementById('node-upstream');
  const nodeRes = document.getElementById('node-res');

  const conn1 = document.getElementById('conn-1');
  const conn2 = document.getElementById('conn-2');
  const conn3 = document.getElementById('conn-3');
  const conn4 = document.getElementById('conn-4');

  if (!triggerBtn || !consoleBox) return;

  let currentRoute = '/health';

  routeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      routeChips.forEach((c) => {
        c.classList.remove('is-active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('is-active');
      chip.setAttribute('aria-selected', 'true');
      currentRoute = chip.getAttribute('data-route') || '/health';
    });
  });

  function appendLog(type, message) {
    const p = document.createElement('div');
    p.className = `terminal-line ${type}`;
    const timestamp = new Date().toISOString().substring(11, 23);
    p.innerHTML = `<span style="color:var(--text-subtle)">[${timestamp}]</span> ${message}`;
    consoleBox.appendChild(p);
    consoleBox.scrollTop = consoleBox.scrollHeight;
  }

  let isSimulating = false;

  triggerBtn.addEventListener('click', () => {
    if (isSimulating) return;
    isSimulating = true;
    triggerBtn.disabled = true;
    triggerBtn.style.opacity = '0.6';

    appendLog('req', `➔ INCOMING: ${currentRoute.startsWith('/forward') ? 'POST' : 'GET'} ${currentRoute} (HTTP/2 via Bun runtime)`);

    // Step 1: Client Node
    nodeClient.classList.add('is-active');
    conn1.classList.add('is-transmitting');

    setTimeout(() => {
      // Step 2: Plugin Hook
      nodeClient.classList.remove('is-active');
      conn1.classList.remove('is-transmitting');
      nodePlugin.classList.add('is-active');
      conn2.classList.add('is-transmitting');
      appendLog('plugin', `⚙ [auth-plugin & rate-limit]: Token verified. Quota: OK (0.04ms)`);
    }, 280);

    setTimeout(() => {
      // Step 3: Humming Kernel Core
      nodePlugin.classList.remove('is-active');
      conn2.classList.remove('is-transmitting');
      nodeCore.classList.add('is-active');
      conn3.classList.add('is-transmitting');
      appendLog('req', `⚡ [humming-kernel]: Route matched -> fast-path zero-copy transport dispatch`);
    }, 560);

    setTimeout(() => {
      // Step 4: Upstream
      nodeCore.classList.remove('is-active');
      conn3.classList.remove('is-transmitting');
      nodeUpstream.classList.add('is-active');
      conn4.classList.add('is-transmitting');
      appendLog('sys', `☁ [upstream-forward]: Microservice stream received 200 OK (0.38ms)`);
    }, 840);

    setTimeout(() => {
      // Step 5: Response Morph & Finished
      nodeUpstream.classList.remove('is-active');
      conn4.classList.remove('is-transmitting');
      nodeRes.classList.add('is-active');
      appendLog('res', `✔ 200 OK | Body: {"status":"success","data":[...]} | Total: 0.52ms`);
    }, 1120);

    setTimeout(() => {
      nodeRes.classList.remove('is-active');
      isSimulating = false;
      triggerBtn.disabled = false;
      triggerBtn.style.opacity = '1';
    }, 1500);
  });
}

// Terminal Tabs Switcher
function initTerminalTabs() {
  const tabs = document.querySelectorAll('.term-tab-btn');
  const codeBlocks = {
    init: `<span class="comment"># 1. Initialize a new BFF project with official plugins</span>
<span class="cmd">bunx humming init</span> my-bff <span class="flag">--template with-plugins</span>

<span class="comment"># 2. Enter workspace & start Bun dev engine</span>
<span class="cmd">cd</span> my-bff
<span class="cmd">bun install</span>
<span class="cmd">bun run dev</span>

<span class="comment"># 3. Test built-in health & options routes</span>
<span class="cmd">curl</span> http://localhost:8788/health
<span class="cmd">curl</span> http://localhost:8788/api/options?keys=teams`,

    dev: `<span class="comment"># Start with hot-reloading in < 2ms</span>
<span class="cmd">bun --watch</span> src/index.ts

<span class="comment"># Output:</span>
<span class="flag">[humming]</span> Kernel initialized on port 8788
<span class="flag">[plugins]</span> Loaded 8 official plugins (auth, cache, metrics, rate-limit...)
<span class="flag">[routes]</span> Ready to proxy /forward/* requests to microservice mesh`,

    docker: `<span class="comment"># Build minimalist ultra-lightweight Bun BFF container</span>
<span class="cmd">docker build</span> -t my-humming-bff .

<span class="comment"># Run container (Base image: oven/bun:alpine, size < 45MB)</span>
<span class="cmd">docker run</span> -p 8788:8788 my-humming-bff`
  };

  const terminalBody = document.getElementById('terminal-code-body');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabKey = tab.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      if (terminalBody && codeBlocks[tabKey]) {
        terminalBody.innerHTML = codeBlocks[tabKey];
      }
    });
  });
}
