/**
 * CM Usthad Archive — Admin Dashboard JS
 * Full CRUD for all content types, auth, import/export
 */

/* ═══════════════════════════════════════
   CONSTANTS & STATE
═══════════════════════════════════════ */
const ADMIN_PW_KEY    = "cmusthad_admin_pw";
const SESSION_KEY     = "cmusthad_admin_session";
const DEFAULT_PW      = "cmusthad2024";

let currentSection    = "overview";
let content           = null;     // the live data object
let editingId         = null;     // id of item being edited
let editingType       = null;     // which content type
let pendingDeleteId   = null;
let pendingDeleteType = null;

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getPassword() {
  return localStorage.getItem(ADMIN_PW_KEY) || DEFAULT_PW;
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function save() {
  window.CMArchive.saveContent(content);
}

/**
 * Read a File object and return a Base64 data URL promise.
 * Also warns if the file is very large (> 1 MB).
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("Warning: File is over 5 MB — may slow storage", "error");
    }
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Wire up a file-picker input to update a URL input + preview
 * @param {string} pickerId   - id of the <input type="file">
 * @param {string} urlId      - id of the <input type="url"> to update
 * @param {string} previewId  - id of the <img> preview element
 */
function wireFilePicker(pickerId, urlId, previewId) {
  const picker  = document.getElementById(pickerId);
  const urlInput = document.getElementById(urlId);
  const preview  = document.getElementById(previewId);
  if (!picker) return;

  picker.addEventListener("change", async () => {
    const file = picker.files[0];
    if (!file) return;
    try {
      showToast("Reading file...", "success");
      const dataUrl = await readFileAsBase64(file);
      urlInput.value = dataUrl;
      if (preview) {
        preview.src    = dataUrl;
        preview.hidden = false;
      }
      showToast("File loaded! Click Save to store it.", "success");
    } catch (err) {
      showToast("Could not read file: " + err.message, "error");
    }
  });

  // Also update preview when URL is typed manually
  if (urlInput && preview) {
    urlInput.addEventListener("input", () => {
      const val = urlInput.value.trim();
      if (val) { preview.src = val; preview.hidden = false; }
      else { preview.hidden = true; }
    });
  }
}

/* ═══════════════════════════════════════
   AUTH
═══════════════════════════════════════ */
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function showDashboard() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("dashboardApp").hidden = false;
  content = window.CMArchive.loadContent();
  renderAll();
}

function showLogin() {
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("dashboardApp").hidden = true;
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = document.getElementById("loginPassword").value;
  if (pw === getPassword()) {
    sessionStorage.setItem(SESSION_KEY, "1");
    document.getElementById("loginError").hidden = true;
    showDashboard();
  } else {
    document.getElementById("loginError").hidden = false;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
const sectionTitles = {
  overview:     "Overview",
  articles:     "Articles",
  images:       "Images",
  books:        "Books",
  news:         "News",
  testimonials: "Testimonials",
  casediary:    "Case Diary",
  settings:     "Settings"
};

document.getElementById("sidebarNav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  switchSection(btn.dataset.section);
  // close sidebar on mobile
  document.querySelector(".sidebar").classList.remove("open");
});

document.querySelectorAll(".quick-action-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchSection(btn.dataset.section);
    // auto-click the add button
    setTimeout(() => {
      const addBtn = document.querySelector(`#add${capitalize(btn.dataset.section)}Btn`);
      if (addBtn) addBtn.click();
    }, 100);
  });
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function switchSection(section) {
  currentSection = section;
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.section === section);
  });
  document.querySelectorAll(".section-content").forEach(s => {
    s.classList.toggle("active", s.id === `section-${section}`);
  });
  document.getElementById("sectionTitle").textContent = sectionTitles[section] || section;
}

// Sidebar toggle (mobile)
document.getElementById("sidebarToggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

/* ═══════════════════════════════════════
   RENDER ALL
═══════════════════════════════════════ */
function renderAll() {
  renderStats();
  renderArticles();
  renderImages();
  renderBooks();
  renderNews();
  renderTestimonials();
  renderCaseDiary();
  renderSettings();
}

/* ── Stats ── */
function renderStats() {
  document.getElementById("statArticles").textContent    = content.articles.length;
  document.getElementById("statImages").textContent      = content.images.length;
  document.getElementById("statBooks").textContent       = content.books.length;
  document.getElementById("statNews").textContent        = content.news.length;
  document.getElementById("statTestimonials").textContent= content.testimonials.length;
  document.getElementById("statCase").textContent        = content.caseDiary.length;
}

/* ══════════════════════════════════════
   ARTICLES
══════════════════════════════════════ */
function renderArticles() {
  const container = document.getElementById("articlesList");
  if (!content.articles.length) {
    container.innerHTML = emptyState("No articles yet. Click \"Add Article\" to create one.");
    return;
  }
  container.innerHTML = content.articles.map(a => `
    <div class="item-card" data-id="${a.id}">
      ${a.image ? `<img class="item-card-image" src="${escHtml(a.image)}" alt="${escHtml(a.imageAlt || '')}" onerror="this.style.display='none'">` : ""}
      <div class="item-card-body">
        <span class="item-card-tag">${escHtml(a.category || "Article")}</span>
        <div class="item-card-title">${escHtml(a.title)}</div>
        <div class="item-card-desc">${escHtml(a.summary)}</div>
        ${a.date ? `<div style="margin-top:8px;font-size:0.76rem;color:var(--text-muted)">${escHtml(a.date)}</div>` : ""}
      </div>
      <div class="item-card-footer">
        <button class="btn-icon" onclick="editItem('articles','${a.id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="confirmDelete('articles','${a.id}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

document.getElementById("addArticleBtn").addEventListener("click", () => {
  openModal("articles", null);
});

function articleForm(data = {}) {
  return `
    <div class="field"><label>Title *</label><input type="text" id="f_title" value="${escHtml(data.title || '')}" placeholder="Article title"></div>
    <div class="field"><label>Category</label><input type="text" id="f_category" value="${escHtml(data.category || '')}" placeholder="e.g. Research, Education, Archive"></div>
    <div class="field"><label>Image URL</label><input type="url" id="f_image" value="${escHtml(data.image || '')}" placeholder="https://..."></div>
    <div class="field"><label>Image Alt Text</label><input type="text" id="f_imageAlt" value="${escHtml(data.imageAlt || '')}" placeholder="Describe the image"></div>
    <div class="field"><label>Summary</label><textarea id="f_summary" rows="3" placeholder="Short description...">${escHtml(data.summary || '')}</textarea></div>
    <div class="field"><label>Date (optional)</label><input type="text" id="f_date" value="${escHtml(data.date || '')}" placeholder="e.g. June 2025"></div>
  `;
}

function collectArticle() {
  const title = document.getElementById("f_title").value.trim();
  if (!title) { showToast("Title is required", "error"); return null; }
  return {
    title,
    category: document.getElementById("f_category").value.trim(),
    image:    document.getElementById("f_image").value.trim(),
    imageAlt: document.getElementById("f_imageAlt").value.trim(),
    summary:  document.getElementById("f_summary").value.trim(),
    date:     document.getElementById("f_date").value.trim(),
    published: true
  };
}

/* ══════════════════════════════════════
   IMAGES
══════════════════════════════════════ */
function renderImages() {
  const container = document.getElementById("imagesList");
  if (!content.images.length) {
    container.innerHTML = emptyState("No images yet. Click \"Add Image\" to upload one.");
    return;
  }
  container.innerHTML = content.images.map(img => `
    <div class="gallery-admin-card" data-id="${img.id}">
      <img class="gallery-admin-img" src="${escHtml(img.src)}" alt="${escHtml(img.alt || '')}" onerror="this.style.background='#1f2937'">
      <div class="gallery-admin-body">
        <div class="gallery-admin-label">${escHtml(img.label || '')}</div>
        <div class="gallery-admin-caption">${escHtml(img.caption || '')}</div>
        <span class="gallery-layout-badge">${escHtml(img.layout || 'normal')}</span>
      </div>
      <div class="gallery-admin-actions">
        <button class="btn-icon" onclick="editItem('images','${img.id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="confirmDelete('images','${img.id}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

document.getElementById("addImageBtn").addEventListener("click", () => {
  openModal("images", null);
});

function imageForm(data = {}) {
  const hasSrc = data.src && data.src.length > 0;
  return `
    <div class="upload-tabs">
      <button type="button" class="upload-tab active" data-tab="file">📁 Upload File</button>
      <button type="button" class="upload-tab" data-tab="url">🔗 Paste URL</button>
    </div>

    <div class="upload-panel" id="tab-file">
      <div class="field">
        <label>Choose Image File</label>
        <div class="file-drop-zone" id="dropZone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;margin:0 auto;display:block;opacity:.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          <p style="margin:8px 0 4px;color:var(--text-secondary)">Click to browse or drag &amp; drop</p>
          <p style="font-size:.75rem;color:var(--text-muted)">JPG, PNG, GIF, WebP, SVG — max 5 MB</p>
          <input type="file" id="f_filePicker" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">
        </div>
      </div>
    </div>

    <div class="upload-panel" id="tab-url" style="display:none">
      <div class="field">
        <label>Image URL</label>
        <input type="url" id="f_src" value="${escHtml(data.src && !data.src.startsWith('data:') ? data.src : '')}" placeholder="https://example.com/photo.jpg">
      </div>
    </div>

    <div class="field" style="margin-top:4px">
      <label>Preview</label>
      <img id="f_preview" src="${hasSrc ? escHtml(data.src) : ''}" alt="Preview"
        style="width:100%;max-height:200px;object-fit:contain;border-radius:8px;background:var(--bg-elevated);${hasSrc ? '' : 'display:none'}"
        ${hasSrc ? '' : 'hidden'}>
      <p id="f_previewEmpty" style="color:var(--text-muted);font-size:.82rem;${hasSrc ? 'display:none' : ''}">No image selected yet.</p>
    </div>

    <div class="field"><label>Alt Text</label><input type="text" id="f_alt" value="${escHtml(data.alt || '')}" placeholder="Describe the image"></div>
    <div class="field"><label>Label / Album</label><input type="text" id="f_label" value="${escHtml(data.label || '')}" placeholder="e.g. Portrait, Campus, Institution"></div>
    <div class="field"><label>Caption</label><textarea id="f_caption" rows="2" placeholder="Caption shown on hover...">${escHtml(data.caption || '')}</textarea></div>
    <div class="field"><label>Layout</label>
      <select id="f_layout">
        <option value="normal"  ${(data.layout || 'normal') === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="tall"    ${data.layout === 'tall'  ? 'selected' : ''}>Tall (double height)</option>
        <option value="wide"    ${data.layout === 'wide'  ? 'selected' : ''}>Wide (double width)</option>
      </select>
    </div>
  `;
}

/** Called right after imageForm HTML is injected into the modal */
function initImageFormLogic() {
  // Tab switching
  document.querySelectorAll(".upload-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".upload-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-file").style.display = tab.dataset.tab === "file" ? "" : "none";
      document.getElementById("tab-url").style.display  = tab.dataset.tab === "url"  ? "" : "none";
    });
  });

  // File picker
  const picker  = document.getElementById("f_filePicker");
  const preview = document.getElementById("f_preview");
  const empty   = document.getElementById("f_previewEmpty");

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please select an image file", "error"); return;
    }
    try {
      showToast("Loading image...", "success");
      const dataUrl = await readFileAsBase64(file);
      // Store in a hidden field we'll read on collect
      picker.dataset.base64 = dataUrl;
      preview.src    = dataUrl;
      preview.hidden = false;
      if (empty) empty.style.display = "none";
      showToast("Image ready — click Save!", "success");
    } catch (e) {
      showToast("Could not read file", "error");
    }
  }

  picker.addEventListener("change", () => handleFile(picker.files[0]));

  // Drag & drop
  const dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    handleFile(e.dataTransfer.files[0]);
  });

  // URL input live preview
  const urlInput = document.getElementById("f_src");
  if (urlInput) {
    urlInput.addEventListener("input", () => {
      const val = urlInput.value.trim();
      if (val) { preview.src = val; preview.hidden = false; if (empty) empty.style.display = "none"; }
      else     { preview.hidden = true; if (empty) empty.style.display = ""; }
    });
  }
}

function collectImage() {
  const picker   = document.getElementById("f_filePicker");
  const urlInput = document.getElementById("f_src");
  const base64   = picker ? picker.dataset.base64 : null;
  const url      = urlInput ? urlInput.value.trim() : "";
  const src      = base64 || url;   // prefer file upload over URL

  if (!src) { showToast("Please upload an image or paste a URL", "error"); return null; }
  return {
    src,
    alt:     document.getElementById("f_alt").value.trim(),
    label:   document.getElementById("f_label").value.trim(),
    caption: document.getElementById("f_caption").value.trim(),
    layout:  document.getElementById("f_layout").value
  };
}

/* ══════════════════════════════════════
   BOOKS
══════════════════════════════════════ */
function renderBooks() {
  const container = document.getElementById("booksList");
  if (!content.books.length) {
    container.innerHTML = emptyState("No books yet.");
    return;
  }
  container.innerHTML = content.books.map(b => `
    <div class="item-card" data-id="${b.id}">
      <div class="item-card-body">
        <span class="item-card-tag">${escHtml(b.label || b.category)}</span>
        <div class="item-card-title">${escHtml(b.title)}</div>
        <div class="item-card-desc">${escHtml(b.description)}</div>
      </div>
      <div class="item-card-footer">
        <button class="btn-icon" onclick="editItem('books','${b.id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="confirmDelete('books','${b.id}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

document.getElementById("addBookBtn").addEventListener("click", () => {
  openModal("books", null);
});

function bookForm(data = {}) {
  return `
    <div class="field"><label>Title *</label><input type="text" id="f_title" value="${escHtml(data.title || '')}" placeholder="Book title"></div>
    <div class="field"><label>Language / Label</label><input type="text" id="f_label" value="${escHtml(data.label || '')}" placeholder="e.g. Arabic, English, Translation"></div>
    <div class="field"><label>Category</label>
      <select id="f_category">
        <option value="astronomy"   ${data.category === 'astronomy'   ? 'selected' : ''}>Astronomy</option>
        <option value="fiqh"        ${data.category === 'fiqh'        ? 'selected' : ''}>Fiqh</option>
        <option value="translation" ${data.category === 'translation' ? 'selected' : ''}>Translation</option>
        <option value="mathematics" ${data.category === 'mathematics' ? 'selected' : ''}>Mathematics</option>
        <option value="other"       ${data.category === 'other'       ? 'selected' : ''}>Other</option>
      </select>
    </div>
    <div class="field"><label>Description</label><textarea id="f_description" rows="3" placeholder="Brief description...">${escHtml(data.description || '')}</textarea></div>
    <div class="field"><label>Link Text</label><input type="text" id="f_linkText" value="${escHtml(data.linkText || '')}" placeholder="e.g. Add scan or PDF"></div>
    <div class="field"><label>Link URL / Anchor</label><input type="text" id="f_linkHref" value="${escHtml(data.linkHref || '#contribute')}" placeholder="#contribute"></div>
  `;
}

function collectBook() {
  const title = document.getElementById("f_title").value.trim();
  if (!title) { showToast("Title is required", "error"); return null; }
  return {
    title,
    label:       document.getElementById("f_label").value.trim(),
    category:    document.getElementById("f_category").value,
    description: document.getElementById("f_description").value.trim(),
    linkText:    document.getElementById("f_linkText").value.trim(),
    linkHref:    document.getElementById("f_linkHref").value.trim() || "#contribute"
  };
}

/* ══════════════════════════════════════
   NEWS
══════════════════════════════════════ */
function renderNews() {
  const container = document.getElementById("newsList");
  if (!content.news.length) {
    container.innerHTML = emptyState("No news items yet.");
    return;
  }
  container.innerHTML = content.news.map(n => `
    <div class="list-item" data-id="${n.id}">
      <span class="list-item-date">${escHtml(n.date)}</span>
      <div class="list-item-content">
        <div class="list-item-title">${escHtml(n.headline)}</div>
        <div class="list-item-desc">${escHtml(n.summary)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="editItem('news','${n.id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="confirmDelete('news','${n.id}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

document.getElementById("addNewsBtn").addEventListener("click", () => {
  openModal("news", null);
});

function newsForm(data = {}) {
  return `
    <div class="field"><label>Date *</label><input type="text" id="f_date" value="${escHtml(data.date || '')}" placeholder="e.g. Aug 29, 2025"></div>
    <div class="field"><label>Headline *</label><input type="text" id="f_headline" value="${escHtml(data.headline || '')}" placeholder="News headline"></div>
    <div class="field"><label>Summary</label><textarea id="f_summary" rows="3" placeholder="Short description...">${escHtml(data.summary || '')}</textarea></div>
  `;
}

function collectNews() {
  const date     = document.getElementById("f_date").value.trim();
  const headline = document.getElementById("f_headline").value.trim();
  if (!date || !headline) { showToast("Date and Headline are required", "error"); return null; }
  return {
    date,
    headline,
    summary: document.getElementById("f_summary").value.trim()
  };
}

/* ══════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════ */
function renderTestimonials() {
  const container = document.getElementById("testimonialsList");
  if (!content.testimonials.length) {
    container.innerHTML = emptyState("No testimonials yet.");
    return;
  }
  container.innerHTML = content.testimonials.map(t => `
    <div class="item-card" data-id="${t.id}">
      <div class="item-card-body">
        <div class="item-card-title" style="font-style:italic;font-family:Georgia,serif;">"${escHtml(t.quote)}"</div>
        <div class="item-card-desc" style="margin-top:10px;">— ${escHtml(t.attribution)}</div>
      </div>
      <div class="item-card-footer">
        <button class="btn-icon" onclick="editItem('testimonials','${t.id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="confirmDelete('testimonials','${t.id}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

document.getElementById("addTestimonialBtn").addEventListener("click", () => {
  openModal("testimonials", null);
});

function testimonialForm(data = {}) {
  return `
    <div class="field"><label>Quote *</label><textarea id="f_quote" rows="4" placeholder="The testimonial text...">${escHtml(data.quote || '')}</textarea></div>
    <div class="field"><label>Attribution *</label><input type="text" id="f_attribution" value="${escHtml(data.attribution || '')}" placeholder="e.g. Former student, 2004"></div>
  `;
}

function collectTestimonial() {
  const quote       = document.getElementById("f_quote").value.trim();
  const attribution = document.getElementById("f_attribution").value.trim();
  if (!quote) { showToast("Quote is required", "error"); return null; }
  return { quote, attribution };
}

/* ══════════════════════════════════════
   CASE DIARY
══════════════════════════════════════ */
function renderCaseDiary() {
  const container = document.getElementById("caseDiaryList");
  if (!content.caseDiary.length) {
    container.innerHTML = emptyState("No case diary entries yet.");
    return;
  }
  container.innerHTML = content.caseDiary.map(c => `
    <div class="list-item" data-id="${c.id}">
      <span class="list-item-date">${escHtml(c.date)}</span>
      <div class="list-item-content">
        <div class="list-item-title">${escHtml(c.headline)}</div>
        <div class="list-item-desc">${escHtml(c.summary)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="editItem('caseDiary','${c.id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="confirmDelete('caseDiary','${c.id}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

document.getElementById("addCaseBtn").addEventListener("click", () => {
  openModal("caseDiary", null);
});

function caseDiaryForm(data = {}) {
  return `
    <div class="field"><label>Date *</label><input type="text" id="f_date" value="${escHtml(data.date || '')}" placeholder="e.g. 15 Feb 2010"></div>
    <div class="field"><label>Headline *</label><input type="text" id="f_headline" value="${escHtml(data.headline || '')}" placeholder="Entry title"></div>
    <div class="field"><label>Summary</label><textarea id="f_summary" rows="4" placeholder="Detailed description...">${escHtml(data.summary || '')}</textarea></div>
  `;
}

function collectCaseDiary() {
  const date     = document.getElementById("f_date").value.trim();
  const headline = document.getElementById("f_headline").value.trim();
  if (!date || !headline) { showToast("Date and Headline are required", "error"); return null; }
  return {
    date,
    headline,
    summary: document.getElementById("f_summary").value.trim()
  };
}

/* ══════════════════════════════════════
   SETTINGS
══════════════════════════════════════ */
function renderSettings() {
  const s = content.settings;
  document.getElementById("settSiteTitle").value = s.siteTitle || "";
  document.getElementById("settHeroCopy").value   = s.heroCopy  || "";
  document.getElementById("settBioText1").value   = s.bioText1  || "";
  document.getElementById("settBioText2").value   = s.bioText2  || "";
}

document.getElementById("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  content.settings.siteTitle = document.getElementById("settSiteTitle").value.trim();
  content.settings.heroCopy  = document.getElementById("settHeroCopy").value.trim();
  content.settings.bioText1  = document.getElementById("settBioText1").value.trim();
  content.settings.bioText2  = document.getElementById("settBioText2").value.trim();

  const newPw = document.getElementById("settAdminPassword").value.trim();
  if (newPw) {
    localStorage.setItem(ADMIN_PW_KEY, newPw);
    document.getElementById("settAdminPassword").value = "";
    showToast("Settings saved. Password updated!", "success");
  } else {
    showToast("Settings saved!", "success");
  }
  save();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("This will reset ALL content to the original defaults. Are you sure?")) {
    content = window.CMArchive.resetContent();
    localStorage.removeItem(ADMIN_PW_KEY);
    renderAll();
    showToast("Reset to defaults", "success");
  }
});

/* ══════════════════════════════════════
   MODAL — Open / Close
══════════════════════════════════════ */
const FORMS = {
  articles:     { form: articleForm,     collect: collectArticle,     key: "articles",     idPrefix: "art"  },
  images:       { form: imageForm,       collect: collectImage,       key: "images",       idPrefix: "img"  },
  books:        { form: bookForm,        collect: collectBook,        key: "books",        idPrefix: "book" },
  news:         { form: newsForm,        collect: collectNews,        key: "news",         idPrefix: "news" },
  testimonials: { form: testimonialForm, collect: collectTestimonial, key: "testimonials", idPrefix: "test" },
  caseDiary:    { form: caseDiaryForm,   collect: collectCaseDiary,   key: "caseDiary",    idPrefix: "case" }
};

const TITLES = {
  articles:     "Article",
  images:       "Image",
  books:        "Book",
  news:         "News Item",
  testimonials: "Testimonial",
  caseDiary:    "Case Diary Entry"
};

function openModal(type, id) {
  editingType = type;
  editingId   = id;
  const cfg   = FORMS[type];
  const data  = id ? content[cfg.key].find(x => x.id === id) : {};
  const label = TITLES[type] || type;

  document.getElementById("modalTitle").textContent = id ? `Edit ${label}` : `Add ${label}`;
  document.getElementById("modalBody").innerHTML    = cfg.form(data || {});
  document.getElementById("modal").hidden           = false;

  // Post-inject logic for forms that need it
  if (type === "images")   initImageFormLogic();
  if (type === "articles") initArticleImageLogic();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  editingId = editingType = null;
}

document.getElementById("modalClose").addEventListener("click",  closeModal);
document.getElementById("modalCancel").addEventListener("click", closeModal);
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal")) closeModal();
});

document.getElementById("modalSave").addEventListener("click", () => {
  if (!editingType) return;
  const cfg  = FORMS[editingType];
  const data = cfg.collect();
  if (!data) return;

  if (editingId) {
    // UPDATE
    const idx = content[cfg.key].findIndex(x => x.id === editingId);
    if (idx !== -1) {
      content[cfg.key][idx] = { ...content[cfg.key][idx], ...data };
    }
    showToast(`${TITLES[editingType]} updated!`, "success");
  } else {
    // CREATE
    data.id = genId(cfg.idPrefix);
    content[cfg.key].push(data);
    showToast(`${TITLES[editingType]} added!`, "success");
  }

  save();
  renderAll();
  closeModal();
});

/* ══════════════════════════════════════
   EDIT / DELETE
══════════════════════════════════════ */
function editItem(type, id) {
  openModal(type, id);
}

function confirmDelete(type, id) {
  pendingDeleteType = type;
  pendingDeleteId   = id;
  document.getElementById("confirmOverlay").hidden = false;
}

document.getElementById("confirmCancel").addEventListener("click", () => {
  document.getElementById("confirmOverlay").hidden = true;
  pendingDeleteId = pendingDeleteType = null;
});

document.getElementById("confirmDelete").addEventListener("click", () => {
  if (!pendingDeleteType || !pendingDeleteId) return;
  const cfg = FORMS[pendingDeleteType];
  content[cfg.key] = content[cfg.key].filter(x => x.id !== pendingDeleteId);
  save();
  renderAll();
  showToast("Deleted", "success");
  document.getElementById("confirmOverlay").hidden = true;
  pendingDeleteId = pendingDeleteType = null;
});

/* ══════════════════════════════════════
   EXPORT / IMPORT
══════════════════════════════════════ */
document.getElementById("exportBtn").addEventListener("click", () => {
  const json = JSON.stringify(content, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `cmusthad-content-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported successfully!", "success");
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.articles || !data.images) {
        showToast("Invalid JSON format", "error");
        return;
      }
      content = data;
      save();
      renderAll();
      showToast("Imported successfully!", "success");
    } catch {
      showToast("Could not parse JSON file", "error");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

/* ══════════════════════════════════════
   UTILITIES
══════════════════════════════════════ */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emptyState(msg) {
  return `<div class="empty-state" style="grid-column:1/-1">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 13h4"/>
    </svg>
    <p>${msg}</p>
  </div>`;
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}

// Make edit/delete globally accessible (called from inline HTML)
window.editItem      = editItem;
window.confirmDelete = confirmDelete;
