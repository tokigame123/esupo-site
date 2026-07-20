const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");
const heroMedia = document.querySelector(".hero-media");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  });

  nav.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "メニューを開く");
  });
}

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    )
  : null;

document.querySelectorAll(".reveal").forEach((element, index) => {
  if (index % 2 === 1) element.classList.add("reveal-from-right");
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add("is-visible");
});

const getNews = () => {
  try {
    const draft = localStorage.getItem("esupoNewsDraft");
    if (draft) return JSON.parse(draft);
  } catch (error) {
    console.warn("ニュース下書きを読み込めませんでした。", error);
  }

  return Array.isArray(window.ESUPO_NEWS) ? window.ESUPO_NEWS : [];
};

const formatDate = (dateString) => dateString.replaceAll("-", ".");

const appendTextParts = (element, parts, fallback) => {
  if (!Array.isArray(parts) || !parts.length) {
    element.textContent = fallback;
    return;
  }

  parts.forEach((part) => {
    const span = document.createElement("span");
    span.className = "phrase-unit";
    span.textContent = part;
    element.append(span);
  });
};

const createNewsCard = (item) => {
  const card = document.createElement("article");
  card.className = "news-card reveal";
  card.id = item.id;

  const imageWrap = document.createElement("div");
  imageWrap.className = "news-image";
  const image = document.createElement("img");
  image.src = item.image || "assets/hero.png";
  image.alt = item.alt || "";
  image.loading = "lazy";
  imageWrap.append(image);

  const copy = document.createElement("div");
  copy.className = "news-card-copy";
  const time = document.createElement("time");
  time.dateTime = item.date;
  time.textContent = formatDate(item.date);
  const title = document.createElement("h3");
  appendTextParts(title, item.titleParts, item.title);
  const summary = document.createElement("p");
  appendTextParts(summary, item.summaryParts, item.summary);
  const more = document.createElement(item.url ? "a" : "span");
  more.className = "read-more";
  more.textContent = item.url ? "詳細を見る →" : "お知らせを読む →";
  if (item.url) {
    more.href = item.url;
    more.target = "_blank";
    more.rel = "noopener noreferrer";
    more.setAttribute("aria-label", `${item.title}の詳細を見る（新しいタブで開きます）`);
  }

  copy.append(time, title, summary, more);
  card.append(imageWrap, copy);
  return card;
};

document.querySelectorAll("[data-news-list]").forEach((container) => {
  const items = [...getNews()].sort((a, b) => b.date.localeCompare(a.date));
  const visibleItems = container.dataset.newsList === "home" ? items.slice(0, 3) : items;

  if (!visibleItems.length) {
    const empty = document.createElement("p");
    empty.className = "empty-news";
    empty.textContent = "現在、お知らせはありません。";
    container.append(empty);
    return;
  }

  visibleItems.forEach((item, index) => {
    const card = createNewsCard(item);
    if (index % 2 === 1) card.classList.add("reveal-from-right");
    container.append(card);
    if (revealObserver) revealObserver.observe(card);
    else card.classList.add("is-visible");
  });
});

if (document.body.dataset.page === "news") {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: getNews()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "NewsArticle",
          headline: item.title,
          datePublished: item.date,
          description: item.summary,
          image: item.image.startsWith("data:") ? undefined : new URL(item.image, "https://esupo.jp/").href,
          url: `https://esupo.jp/news.html#${item.id}`,
          publisher: { "@type": "Organization", name: "合同会社えーすぽ" },
        },
      })),
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(structuredData);
  document.head.append(script);
}

let scrollTicking = false;
const updateScrollEffects = () => {
  const scrollY = window.scrollY;
  if (header) header.classList.toggle("is-scrolled", scrollY > 16);
  if (heroMedia && scrollY < window.innerHeight) {
    heroMedia.style.setProperty("--hero-shift", `${scrollY * 0.05}px`);
  }
  scrollTicking = false;
};

window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollEffects);
  },
  { passive: true },
);

updateScrollEffects();
