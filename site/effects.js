// effects.js - Interactive features for the Endel-style Humming landing page

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCliCopy();
  initModeSwitcher();
  initPipelineSimulator();
  initTerminalTabs();
  initTelemetryCounters();
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

// Mode Switcher synchronization (Hero Player & Mode Cards)
function initModeSwitcher() {
  const modeCards = document.querySelectorAll('.mode-card');
  const modeTags = document.querySelectorAll('.mode-tag');

  function activateMode(mode) {
    // Update Soundscape instance if present
    if (window.soundscapeInstance) {
      window.soundscapeInstance.setMode(mode);
      window.soundscapeInstance.pulseWave(1.8);
    }

    modeCards.forEach((c) => {
      if (c.getAttribute('data-mode-card') === mode) {
        c.classList.add('is-active');
      } else {
        c.classList.remove('is-active');
      }
    });

    modeTags.forEach((t) => {
      if (t.getAttribute('data-sound-mode') === mode) {
        t.classList.add('is-active');
      } else {
        t.classList.remove('is-active');
      }
    });
  }

  modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      const mode = card.getAttribute('data-mode-card');
      if (mode) activateMode(mode);
    });
  });

  modeTags.forEach((tag) => {
    tag.addEventListener('click', () => {
      const mode = tag.getAttribute('data-sound-mode');
      if (mode) activateMode(mode);
    });
  });
}

// Live Request Pipeline Simulator
function initPipelineSimulator() {
  const triggerBtn = document.getElementById('pipeline-trigger-btn');
  const routeSelect = document.getElementById('pipeline-route-select');
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

    const selectedRoute = routeSelect ? routeSelect.value : '/api/options?keys=teams';
    appendLog('req', `➔ INCOMING: GET ${selectedRoute} (HTTP/2 via Bun runtime)`);

    if (window.soundscapeInstance) {
      window.soundscapeInstance.pulseWave(2.2);
    }

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

// Telemetry Simulated Subtle Variation
function initTelemetryCounters() {
  const rpsVal = document.getElementById('telemetry-rps-val');
  if (!rpsVal) return;

  setInterval(() => {
    const base = 182400;
    const variation = Math.floor((Math.random() - 0.5) * 3200);
    const formatted = (base + variation).toLocaleString();
    rpsVal.textContent = `${formatted} req/s`;
  }, 2400);
}
