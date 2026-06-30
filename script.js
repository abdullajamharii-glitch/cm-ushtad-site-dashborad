/**
 * CM Usthad Archive — Public Site Script
 * Dynamically renders content from the shared data store (localStorage / defaults).
 */

/* ── Nav ── */
const navToggle = document.querySelector(".nav-toggle");
const siteNav   = document.querySelector(".site-nav");

// Footer year
const yearEl = document.getElementById("footerYear");
if (yearEl) yearEl.textContent = new Date().getFullYear();

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

/* ── Image dialog ── */
const dialog = document.querySelector(".image-dialog");

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

function openGalleryDialog(src, alt, caption) {
  dialog.querySelector("img").src = src;
  dialog.querySelector("img").alt = alt;
  dialog.querySelector("p").textContent = caption;
  dialog.showModal();
}

/* ══════════════════════════════════════
   DYNAMIC RENDERING
══════════════════════════════════════ */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSite() {
  const data = window.CMArchive.loadContent();

  // ── Settings ──
  const s = data.settings || {};
  if (s.siteTitle) document.title = s.siteTitle + " Archive";
  const heroCopyEl = document.querySelector(".hero-copy");
  if (heroCopyEl && s.heroCopy) heroCopyEl.textContent = s.heroCopy;
  const bioPs = document.querySelectorAll(".bio-copy p");
  if (bioPs[0] && s.bioText1) bioPs[0].textContent = s.bioText1;
  if (bioPs[1] && s.bioText2) bioPs[1].textContent = s.bioText2;

  // ── Articles ──
  const articleGrid = document.getElementById("articleGrid");
  if (articleGrid && data.articles && data.articles.length) {
    articleGrid.innerHTML = data.articles
      .filter(a => a.published !== false)
      .map(a => `
        <article class="article-card">
          ${a.image ? `<img src="${escHtml(a.image)}" alt="${escHtml(a.imageAlt || '')}" loading="lazy">` : ""}
          <div>
            ${a.category ? `<span>${escHtml(a.category)}</span>` : ""}
            <h3>${escHtml(a.title)}</h3>
            <p>${escHtml(a.summary)}</p>
            ${a.date ? `<p style="color:var(--muted);font-size:.82rem;margin-top:8px">${escHtml(a.date)}</p>` : ""}
          </div>
        </article>
      `).join("");
  }

  // ── Books ──
  const bookGrid = document.getElementById("bookGrid");
  if (bookGrid && data.books && data.books.length) {
    bookGrid.innerHTML = data.books.map(b => `
      <article class="book-card" data-category="${escHtml(b.category || '')}" data-title="${escHtml(b.title)}">
        <span class="book-label">${escHtml(b.label || '')}</span>
        <h3>${escHtml(b.title)}</h3>
        <p>${escHtml(b.description)}</p>
        ${b.linkText ? `<a href="${escHtml(b.linkHref || '#contribute')}">${escHtml(b.linkText)}</a>` : ""}
      </article>
    `).join("");

    // Re-attach filter/search after dynamic render
    initBookFilters();
  }

  // ── Images / Gallery ──
  const galleryGrid = document.querySelector(".gallery-grid");
  if (galleryGrid && data.images && data.images.length) {
    galleryGrid.innerHTML = data.images.map(img => {
      const layoutClass = img.layout === "tall" ? " tall" : img.layout === "wide" ? " wide" : "";
      return `
        <button class="gallery-item${layoutClass}" type="button"
          data-src="${escHtml(img.src)}"
          data-alt="${escHtml(img.alt || '')}"
          data-caption="${escHtml(img.caption || '')}">
          <img src="${escHtml(img.src)}" alt="${escHtml(img.alt || '')}" loading="lazy">
          <span>${escHtml(img.label || '')}</span>
        </button>
      `;
    }).join("");

    // Re-attach gallery click handlers
    document.querySelectorAll(".gallery-item").forEach(item => {
      item.addEventListener("click", () => {
        openGalleryDialog(
          item.dataset.src,
          item.dataset.alt,
          item.dataset.caption
        );
      });
    });
  }

  // ── News ──
  const newsListEl = document.querySelector(".news-list");
  if (newsListEl && data.news && data.news.length) {
    newsListEl.innerHTML = data.news.map(n => `
      <article>
        <time>${escHtml(n.date)}</time>
        <h3>${escHtml(n.headline)}</h3>
        <p>${escHtml(n.summary)}</p>
      </article>
    `).join("");
  }

  // ── Testimonials ──
  const voicesGrid = document.querySelector(".voices-grid");
  if (voicesGrid && data.testimonials && data.testimonials.length) {
    voicesGrid.innerHTML = data.testimonials.map(t => `
      <figure>
        <blockquote>${escHtml(t.quote)}</blockquote>
        <figcaption>${escHtml(t.attribution)}</figcaption>
      </figure>
    `).join("");
  }

  // ── Case Diary ──
  const caseList = document.querySelector(".case-list");
  if (caseList && data.caseDiary && data.caseDiary.length) {
    caseList.innerHTML = data.caseDiary.map(c => `
      <li>
        <time>${escHtml(c.date)}</time>
        <h3>${escHtml(c.headline)}</h3>
        <p>${escHtml(c.summary)}</p>
      </li>
    `).join("");
  }
}

/* ══════════════════════════════════════
   BOOK FILTERS
══════════════════════════════════════ */
function initBookFilters() {
  const filterButtons = document.querySelectorAll(".filter-button");
  const bookSearch    = document.querySelector("#bookSearch");

  function updateBookCards() {
    const bookCards   = document.querySelectorAll(".book-card");
    const activeFilter = document.querySelector(".filter-button.active")?.dataset.filter || "all";
    const searchTerm  = bookSearch ? bookSearch.value.trim().toLowerCase() : "";

    bookCards.forEach((card) => {
      const matchesFilter = activeFilter === "all" || card.dataset.category === activeFilter;
      const text          = `${card.dataset.title} ${card.textContent}`.toLowerCase();
      const matchesSearch = !searchTerm || text.includes(searchTerm);
      card.hidden = !(matchesFilter && matchesSearch);
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      updateBookCards();
    });
  });

  if (bookSearch) bookSearch.addEventListener("input", updateBookCards);
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
renderSite();
initBookFilters();
