// docs-viewer.js - Bilingual In-browser Markdown Reader with TOC, Search, Code Copy, and Alerts
(function () {
  'use strict';

  const STORAGE_KEY = 'humming-site-lang';

  const DOCS_NAV_DATA = {
    en: {
      searchPlaceholder: 'Filter documentation...',
      portalText: 'Docs',
      onThisPage: 'ON THIS PAGE',
      editGithub: 'Edit on GitHub',
      prev: '← Previous',
      next: 'Next →',
      groups: [
        {
          group: 'Core Architecture Guides',
          items: [
            { id: 'overview', title: 'Architecture Overview', file: './overview.md', icon: '🏛️' },
            { id: 'plugin-system', title: 'Plugin System Architecture', file: './plugin-system.md', icon: '🧩' },
            { id: 'transport', title: 'Transport & Forwarding', file: './transport.md', icon: '🚀' },
            { id: 'production', title: 'Production Guide', file: './production.md', icon: '🛡️' }
          ]
        },
        {
          group: 'Tooling & Real-World Guides',
          items: [
            { id: 'cli', title: 'CLI Toolchain', file: './cli.md', icon: '⌨️' },
            { id: 'benchmark', title: 'Benchmark & Load Testing', file: './benchmark.md', icon: '📈' },
            { id: 'plugin-guide', title: 'Plugin Authoring Guide', file: '../PLUGIN_GUIDE.md', icon: '📘' }
          ]
        }
      ]
    },
    zh: {
      searchPlaceholder: '搜索或过滤技术文档...',
      portalText: '文档中心',
      onThisPage: '本页大纲',
      editGithub: '在 GitHub 上编辑此页',
      prev: '← 上一篇',
      next: '下一篇 →',
      groups: [
        {
          group: '核心设计指南',
          items: [
            { id: 'overview', title: '架构概览', file: './zh/overview.md', icon: '🏛️' },
            { id: 'plugin-system', title: '插件系统架构', file: './zh/plugin-system.md', icon: '🧩' },
            { id: 'transport', title: '传输层与转发机制', file: './zh/transport.md', icon: '🚀' },
            { id: 'production', title: '生产就绪指南', file: './zh/production.md', icon: '🛡️' }
          ]
        },
        {
          group: '工具链与实战',
          items: [
            { id: 'cli', title: 'CLI 脚手架工具链', file: './zh/cli.md', icon: '⌨️' },
            { id: 'benchmark', title: '性能基准与压测', file: './zh/benchmark.md', icon: '📈' },
            { id: 'plugin-guide', title: '插件开发实战指南', file: './zh/PLUGIN_GUIDE.md', icon: '📘' }
          ]
        }
      ]
    }
  };

  function getCurrentLang() {
    try {
      const docLang = document.documentElement.lang;
      if (docLang === 'zh' || docLang === 'en') return docLang;

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (_) {}
    const nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  function getActiveNavGroup() {
    const lang = getCurrentLang();
    return DOCS_NAV_DATA[lang] || DOCS_NAV_DATA.en;
  }

  function getAllDocs() {
    const data = getActiveNavGroup();
    return data.groups.flatMap((g) => g.items);
  }

  function getDocIdFromUrl() {
    const allDocs = getAllDocs();
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('doc');
    const found = allDocs.find((d) => d.id === requested);
    return found ? found.id : 'overview';
  }

  function renderSidebar() {
    const navContainer = document.getElementById('docs-sidebar-nav');
    const searchInput = document.getElementById('docs-search-input');
    if (!navContainer) return;

    const currentId = getDocIdFromUrl();
    const navData = getActiveNavGroup();

    if (searchInput) {
      searchInput.placeholder = navData.searchPlaceholder;
    }

    navContainer.innerHTML = navData.groups.map((group) => `
      <div class="sidebar-group">
        <div class="sidebar-group-title">${group.group}</div>
        <ul class="sidebar-menu-list">
          ${group.items.map((item) => `
            <li>
              <a 
                href="?doc=${item.id}" 
                class="sidebar-doc-link ${item.id === currentId ? 'is-active' : ''}"
                data-doc-id="${item.id}"
              >
                <span class="sidebar-icon">${item.icon}</span>
                <span class="sidebar-text">${item.title}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');

    navContainer.querySelectorAll('.sidebar-doc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const docId = link.getAttribute('data-doc-id');
        history.pushState(null, '', `?doc=${docId}`);
        updateActiveSidebar(docId);
        loadCurrentDoc();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function updateActiveSidebar(currentId) {
    document.querySelectorAll('.sidebar-doc-link').forEach((link) => {
      const isTarget = link.getAttribute('data-doc-id') === currentId;
      link.classList.toggle('is-active', isTarget);
      if (isTarget) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  async function loadCurrentDoc() {
    const currentId = getDocIdFromUrl();
    updateActiveSidebar(currentId);

    const allDocs = getAllDocs();
    const navData = getActiveNavGroup();
    const docMeta = allDocs.find((d) => d.id === currentId) || allDocs[0];
    const contentEl = document.getElementById('doc-markdown-body');
    const breadcrumbEl = document.getElementById('doc-breadcrumb-title');
    const editLinkEl = document.getElementById('doc-edit-github-link');
    const readingTimeEl = document.getElementById('doc-reading-time');
    const tocHeader = document.querySelector('.toc-header span');

    const breadcrumbRoot = document.querySelector('.docs-breadcrumbs a');
    if (breadcrumbRoot) breadcrumbRoot.textContent = navData.portalText;
    if (breadcrumbEl) breadcrumbEl.textContent = docMeta.title;
    if (tocHeader) tocHeader.textContent = navData.onThisPage;
    if (editLinkEl) {
      const span = editLinkEl.querySelector('span');
      if (span) span.textContent = navData.editGithub;
      const cleanPath = docMeta.file.replace(/^\.\//, 'docs/').replace(/^\.\.\//, '');
      editLinkEl.href = `https://github.com/vinono/humming/blob/main/${cleanPath}`;
    }

    try {
      const res = await fetch(docMeta.file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const markdown = await res.text();

      renderMarkdownContent(markdown, docMeta, navData);
    } catch (err) {
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="docs-error-state">
            <h3>Failed to load document</h3>
            <p>Could not fetch <code>${docMeta.file}</code> (${err.message})</p>
            <a href="../README.md" class="btn-secondary" style="margin-top:16px;">View on GitHub ↗</a>
          </div>
        `;
      }
    }
  }

  function renderMarkdownContent(rawMarkdown, docMeta, navData) {
    const contentEl = document.getElementById('doc-markdown-body');
    if (!contentEl) return;

    let html = '';
    try {
      if (window.marked && typeof window.marked.parse === 'function') {
        html = window.marked.parse(rawMarkdown);
      }
    } catch (_) {}

    if (!html) {
      html = rawMarkdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\n\n/g, '<br/><br/>');
    }

    contentEl.innerHTML = html;

    try { postProcessAlerts(contentEl); } catch (_) {}
    try { postProcessCodeBlocks(contentEl); } catch (_) {}
    try { generateTableOfContents(contentEl); } catch (_) {}
    try { renderDocPager(docMeta, navData); } catch (_) {}

    document.title = `${docMeta.title} | humming Docs`;
  }

  // GitHub Alert Callouts
  function postProcessAlerts(root) {
    const blockquotes = root.querySelectorAll('blockquote');
    blockquotes.forEach((bq) => {
      const text = bq.innerHTML.trim();
      const alertMatch = text.match(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

      if (alertMatch) {
        const type = alertMatch[1].toUpperCase();
        const cleanHtml = text.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').replace(/^<p><br>/, '<p>');
        
        const icons = {
          NOTE: 'ℹ️',
          TIP: '💡',
          IMPORTANT: '🟣',
          WARNING: '⚠️',
          CAUTION: '🚨'
        };

        bq.className = `github-alert alert-${type.toLowerCase()}`;
        bq.innerHTML = `
          <div class="alert-title">
            <span class="alert-icon">${icons[type] || 'ℹ️'}</span>
            <span>${type}</span>
          </div>
          <div class="alert-content">${cleanHtml}</div>
        `;
      }
    });
  }

  // Code Block Syntax Coloring & Copy Button with Mac-style Header
  function postProcessCodeBlocks(root) {
    const pres = root.querySelectorAll('pre');
    pres.forEach((pre) => {
      const code = pre.querySelector('code');
      if (!code) return;

      // Detect & normalize language
      let lang = 'text';
      const classMatch = (code.className || '').match(/language-([a-zA-Z0-9_-]+)/);
      if (classMatch) {
        lang = classMatch[1].toLowerCase();
      }

      if (lang === 'ts') lang = 'typescript';
      if (lang === 'js') lang = 'javascript';
      if (lang === 'sh' || lang === 'shell') lang = 'bash';

      code.className = `language-${lang}`;

      const langDisplayMap = {
        typescript: 'TypeScript',
        javascript: 'JavaScript',
        bash: 'Bash',
        json: 'JSON',
        yaml: 'YAML',
        html: 'HTML',
        css: 'CSS',
        text: 'Plain Text'
      };

      const langLabel = langDisplayMap[lang] || lang.toUpperCase();

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <div class="code-block-dots">
          <span class="code-dot dot-red"></span>
          <span class="code-dot dot-yellow"></span>
          <span class="code-dot dot-green"></span>
        </div>
        <div class="code-block-lang">${langLabel}</div>
        <button type="button" class="btn-code-copy" aria-label="Copy code to clipboard">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
      `;

      const copyBtn = header.querySelector('.btn-code-copy');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          copyBtn.innerHTML = `<span style="color:var(--accent-emerald)">✓ Copied!</span>`;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `;
          }, 2000);
        } catch (_) {}
      });

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      try {
        if (window.Prism && typeof window.Prism.highlightElement === 'function') {
          window.Prism.highlightElement(code);
        }
      } catch (_) {}
    });
  }

  // Generate Table of Contents (TOC)
  function generateTableOfContents(root) {
    const tocList = document.getElementById('doc-toc-list');
    if (!tocList) return;

    const headings = root.querySelectorAll('h2, h3');
    if (!headings.length) {
      tocList.innerHTML = '<li class="toc-empty" style="color:var(--text-subtle);font-size:0.8rem;">No sections</li>';
      return;
    }

    tocList.innerHTML = Array.from(headings).map((h, i) => {
      const text = h.textContent.replace(/^#+\s*/, '');
      const id = 'heading-' + i;
      h.id = id;

      const level = h.tagName.toLowerCase();
      return `
        <li class="toc-item toc-${level}">
          <a href="#${id}" class="toc-link">${text}</a>
        </li>
      `;
    }).join('');

    tocList.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const top = targetEl.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top, behavior: 'smooth' });
          history.replaceState(null, '', `#${targetId}`);
        }
      });
    });

    try {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocList.querySelectorAll('.toc-link').forEach((l) => {
              l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`);
            });
          }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });

      headings.forEach((h) => observer.observe(h));
    } catch (_) {}
  }

  // Previous / Next Article Navigation
  function renderDocPager(currentDoc, navData) {
    const pagerEl = document.getElementById('doc-pager');
    if (!pagerEl) return;

    const allDocs = getAllDocs();
    const currentIndex = allDocs.findIndex((d) => d.id === currentDoc.id);
    const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
    const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

    pagerEl.innerHTML = `
      <div class="doc-pager-grid">
        ${prevDoc ? `
          <a href="?doc=${prevDoc.id}" class="pager-card pager-prev sidebar-doc-link" data-doc-id="${prevDoc.id}">
            <span class="pager-direction">${navData.prev}</span>
            <span class="pager-title">${prevDoc.title}</span>
          </a>
        ` : '<div></div>'}
        ${nextDoc ? `
          <a href="?doc=${nextDoc.id}" class="pager-card pager-next sidebar-doc-link" data-doc-id="${nextDoc.id}">
            <span class="pager-direction">${navData.next}</span>
            <span class="pager-title">${nextDoc.title}</span>
          </a>
        ` : '<div></div>'}
      </div>
    `;

    pagerEl.querySelectorAll('.sidebar-doc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const docId = link.getAttribute('data-doc-id');
        history.pushState(null, '', `?doc=${docId}`);
        updateActiveSidebar(docId);
        loadCurrentDoc();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // Sidebar Search Filter
  function initSearch() {
    const searchInput = document.getElementById('docs-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      document.querySelectorAll('.sidebar-menu-list li').forEach((li) => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  function initDocsViewer() {
    renderSidebar();
    initSearch();
    loadCurrentDoc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDocsViewer);
  } else {
    initDocsViewer();
  }

  window.addEventListener('popstate', () => {
    loadCurrentDoc();
  });

  window.addEventListener('humming:lang-changed', () => {
    renderSidebar();
    loadCurrentDoc();
  });
})();
