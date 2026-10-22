(() => {
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const motionToggle = document.querySelector('.motion-toggle');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const icon = (name) => {
    const element = document.createElement('i');
    element.dataset.lucide = name;
    element.setAttribute('aria-hidden', 'true');
    return element;
  };
  const refreshIcons = () => window.lucide?.createIcons();

  const closeMenu = () => {
    nav?.classList.remove('is-open');
    body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'メニューを開く');
  };
  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  });
  nav?.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  window.addEventListener('keydown', (event) => {
    if (!body.classList.contains('menu-open')) return;
    if (event.key === 'Escape') { closeMenu(); menuToggle?.focus(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...header.querySelectorAll('a,button')].filter((element) => element.getBoundingClientRect().width > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', closeMenu);

  let motionOff = motionPreference.matches;
  const applyMotion = () => {
    body.classList.toggle('motion-off', motionOff);
    motionToggle?.setAttribute('aria-pressed', String(motionOff));
    const label = motionOff ? 'アニメーションを再生' : 'アニメーションを停止';
    motionToggle?.setAttribute('aria-label', label);
    if (motionToggle) {
      motionToggle.title = label;
      motionToggle.replaceChildren(icon(motionOff ? 'play' : 'pause'));
    }
    refreshIcons();
  };
  motionToggle?.addEventListener('click', () => { motionOff = !motionOff; applyMotion(); });
  motionPreference.addEventListener('change', (event) => { motionOff = event.matches; applyMotion(); });

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries, current) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      current.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' }) : null;
  const reveal = (element, index = 0) => {
    if (element.matches('.news-card,.skills>li,.business-photo,.representative-photo')) {
      element.dataset.direction = index % 2 ? 'right' : 'left';
    }
    if (observer) observer.observe(element);
    else element.classList.add('is-visible');
  };
  document.querySelectorAll('.reveal').forEach(reveal);

  let framePending = false;
  const updateScroll = () => {
    const scroll = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty('--page-progress', String(max > 0 ? scroll / max : 0));
    header?.classList.toggle('is-fixed', scroll > 90);
    if (hero && scroll < window.innerHeight && !motionOff) hero.style.setProperty('--hero-scroll', `${scroll * .12}px`);
    framePending = false;
  };
  window.addEventListener('scroll', () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateScroll);
  }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  if (hero && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', (event) => {
      if (motionOff) return;
      hero.style.setProperty('--pointer-x', `${(event.clientX / window.innerWidth - .5) * 13}px`);
      hero.style.setProperty('--pointer-y', `${(event.clientY / window.innerHeight - .5) * 9}px`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { hero.style.setProperty('--pointer-x', '0px'); hero.style.setProperty('--pointer-y', '0px'); });
  }

  const businessImage = document.querySelector('[data-business-image]');
  document.querySelectorAll('.service').forEach((detail) => {
    detail.addEventListener('toggle', () => {
      if (!detail.open || !businessImage) return;
      document.querySelectorAll('.service').forEach((other) => { if (other !== detail) other.open = false; });
      businessImage.src = detail.dataset.image;
      businessImage.alt = detail.dataset.alt;
      document.querySelector('[data-business-caption]').textContent = detail.dataset.caption;
    });
  });

  let newsSource = Array.isArray(window.ESUPO_NEWS) ? window.ESUPO_NEWS : [];
  const draftPreview = new URLSearchParams(window.location.search).get('preview') === '1';
  if (draftPreview) {
    try {
      const draft = JSON.parse(localStorage.getItem('esupoNewsDraft') || 'null');
      if (Array.isArray(draft)) newsSource = draft;
    } catch (error) { console.warn('ニュース下書きを読み込めませんでした。', error); }
  }
  const news = [...newsSource].sort((a,b) => b.date.localeCompare(a.date));
  const categoryFor = (item) => {
    const labels = { event: 'イベント', school: 'スクール', company: '会社情報' };
    if (Object.hasOwn(labels, item.category)) return [item.category, labels[item.category]];
    return item.id.includes('ideathon') ? ['event','イベント'] : item.id.includes('school') ? ['school','スクール'] : ['company','会社情報'];
  };
  if (draftPreview) {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = 'noindex,nofollow';
  }
  if (body.classList.contains('news-page') && !draftPreview) {
    const structuredData = document.createElement('script');
    structuredData.type = 'application/ld+json';
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: news.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'NewsArticle',
          headline: item.title,
          datePublished: item.date,
          description: item.summary,
          articleBody: [item.summary, ...(item.body || []).map(block => [block.heading, block.text].filter(Boolean).join(' '))].join('\n\n'),
          image: item.image.startsWith('data:') ? undefined : new URL(item.image, 'https://esupo.jp/').href,
          url: `https://esupo.jp/news.html#${item.id}`,
          publisher: { '@type': 'Organization', '@id': 'https://esupo.jp/#organization', name: '合同会社えーすぽ', url: 'https://esupo.jp/' },
        },
      })),
    });
    document.head.append(structuredData);
  }
  const appendParts = (element, parts, fallback) => {
    if (!Array.isArray(parts) || !parts.length) { element.textContent = fallback; return; }
    parts.forEach((text) => { const span = document.createElement('span'); span.className = 'phrase'; span.textContent = text; element.append(span); });
  };
  const newsMeta = (item) => {
    const meta = document.createElement('div'); meta.className = 'news-meta';
    const time = document.createElement('time'); time.dateTime = item.date; time.textContent = item.date.replaceAll('-','.');
    const category = document.createElement('span'); category.className = 'news-category'; category.textContent = categoryFor(item)[1];
    meta.append(time, category); return meta;
  };
  const dialog = document.querySelector('.news-dialog');
  const dialogContent = document.querySelector('.dialog-content');
  let previousFocus;
  const openNews = (item, trigger) => {
    if (!dialog || !dialogContent) return;
    previousFocus = trigger;
    const image = document.createElement('img'); image.className = 'dialog-image'; image.src = item.image; image.alt = item.alt || ''; image.width = item.imageWidth || 1280; image.height = item.imageHeight || 720;
    const copy = document.createElement('div'); copy.className = 'dialog-copy';
    const title = document.createElement('h2'); title.id = 'dialog-title'; appendParts(title, item.titleParts, item.title);
    const summary = document.createElement('p'); appendParts(summary, item.summaryParts, item.summary);
    copy.append(newsMeta(item),title,summary);
    if (Array.isArray(item.body)) {
      const articleBody = document.createElement('div'); articleBody.className = 'article-body';
      item.body.forEach((block) => {
        if (block.heading) {
          const heading = document.createElement('h3');
          appendParts(heading, block.headingParts, block.heading);
          articleBody.append(heading);
        }
        if (block.text) {
          const paragraph = document.createElement('p'); appendParts(paragraph, block.textParts, block.text);
          articleBody.append(paragraph);
        }
      });
      copy.append(articleBody);
    }
    if (item.url) {
      const link = document.createElement('a'); link.className = 'inline-link'; link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = /^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\//.test(item.url) ? 'Xの告知を見る' : '詳細ページを見る'; link.append(icon('arrow-up-right')); copy.append(link);
    }
    dialogContent.replaceChildren(image,copy);
    refreshIcons();
    dialog.showModal();
    body.classList.add('dialog-open');
  };
  document.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => { body.classList.remove('dialog-open'); previousFocus?.focus({ preventScroll: true }); });
  const renderNews = (filter = 'all') => {
    document.querySelectorAll('[data-news-list]').forEach((container) => {
      const items = news.filter((item) => filter === 'all' || categoryFor(item)[0] === filter);
      container.replaceChildren();
      const visible = container.dataset.newsList === 'home' ? items.slice(0,3) : items;
      if (!visible.length) { const empty = document.createElement('p'); empty.className = 'empty-news'; empty.textContent = 'このカテゴリのお知らせはありません。'; container.append(empty); }
      visible.forEach((item,index) => {
        const article = document.createElement('article'); article.className = 'news-card reveal'; article.id = item.id;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'news-open'; button.setAttribute('aria-label', `${item.title}の詳細を読む`); button.setAttribute('aria-haspopup','dialog');
        const media = document.createElement('div'); media.className = 'news-image';
        const image = document.createElement('img'); image.src = item.image; image.alt = item.alt || ''; image.loading = 'lazy'; image.width = item.imageWidth || 1280; image.height = item.imageHeight || 720;
        if (item.imageFit === 'contain') media.classList.add('is-contained');
        const arrow = document.createElement('span'); arrow.className = 'news-image-arrow'; arrow.append(icon('arrow-up-right')); media.append(image,arrow);
        const title = document.createElement('h3'); appendParts(title,item.titleParts,item.title);
        const rule = document.createElement('div'); rule.className = 'news-card-rule';
        button.append(media,newsMeta(item),title,rule); article.append(button); container.append(article); reveal(article,index);
        button.addEventListener('click', () => openNews(item,button));
      });
    });
    refreshIcons();
  };
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((other) => other.setAttribute('aria-pressed',String(other === button)));
      renderNews(button.dataset.filter);
    });
  });
  const count = document.querySelector('[data-filter="all"]>span');
  if (count) count.textContent = String(news.length).padStart(2,'0');
  renderNews(); applyMotion(); updateScroll();
})();
