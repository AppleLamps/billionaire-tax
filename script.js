const billPath = "billionaires-tax.txt";

const contentEl = document.getElementById("bill-content");
const tocList = document.getElementById("toc-list");
const progressFill = document.getElementById("progress-fill");
const highlightToolbar = document.getElementById("highlight-toolbar");
const applyHighlightBtn = document.getElementById("apply-highlight");
const clearHighlightsBtn = document.getElementById("clear-highlights");
const highlightDrawer = document.getElementById("highlight-drawer");
const highlightListEl = document.getElementById("highlight-list");

const STAMP_HEADINGS = new Set(["RECEIVED"]);
const STAMP_LINES = new Set(["INITIATIVE COORDINATOR", "ATTORNEY GENERAL'S OFFICE"]);
const HIGHLIGHT_STORAGE_KEY = "billHighlights:v1";
const HIGHLIGHT_COLOR_KEY = "billHighlightColor:v1";
const HIGHLIGHT_SNIPPET_MAX = 140;

let highlightIndexBound = false;
let mobileDrawerBound = false;

function getHeadingId(text, slugCounts, nextFallbackId) {
  const base = slugify(text);
  if (!base) {
    return `section-${nextFallbackId()}`;
  }
  const count = (slugCounts.get(base) || 0) + 1;
  slugCounts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function isStampDate(text) {
  return /^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}$/.test(text);
}

function isAllCapsShort(text) {
  return /^[A-Z\s'&-]+$/.test(text) && text.length <= 40;
}

function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  // Block dangerous protocols
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return false;
  }
  // Allow relative URLs, http, https
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/") || !trimmed.includes(":");
}

function parseBill(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const letterBlocks = [];
  const billBlocks = [];
  let paragraph = [];
  let skipStampBlock = false;
  let foundActTitle = false;

  const flushParagraph = (targetBlocks) => {
    if (!paragraph.length) {
      return;
    }
    const joined = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (joined) {
      targetBlocks.push({ kind: "p", text: joined });
    }
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const currentBlocks = foundActTitle ? billBlocks : letterBlocks;

    if (!trimmed) {
      flushParagraph(currentBlocks);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph(currentBlocks);
      const headingText = headingMatch[2].trim();
      const headingKey = headingText.toUpperCase();

      // Check if this is the main act title
      if (headingKey.includes("THE 2026 BILLIONAIRE TAX ACT")) {
        foundActTitle = true;
        billBlocks.push({
          kind: "heading",
          level: headingMatch[1].length,
          text: headingText,
          isActTitle: true,
        });
        continue;
      }

      if (STAMP_HEADINGS.has(headingKey)) {
        skipStampBlock = true;
        continue;
      }
      if (skipStampBlock && isStampDate(headingText)) {
        continue;
      }
      skipStampBlock = false;
      currentBlocks.push({
        kind: "heading",
        level: headingMatch[1].length,
        text: headingText,
      });
      continue;
    }

    if (skipStampBlock) {
      const stampKey = trimmed.toUpperCase();
      if (STAMP_LINES.has(stampKey) || isStampDate(trimmed) || isAllCapsShort(trimmed)) {
        flushParagraph(currentBlocks);
        continue;
      }
      skipStampBlock = false;
    }

    const imageMatch = /^!\[(.*?)\]\((.*?)\)$/.exec(trimmed);
    if (imageMatch) {
      flushParagraph(currentBlocks);
      currentBlocks.push({
        kind: "image",
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph(foundActTitle ? billBlocks : letterBlocks);
  return { letter: letterBlocks, bill: billBlocks };
}

function createParagraph(text) {
  const element = document.createElement("p");
  const match = /^\(([a-z0-9]+)\)\s+/i.exec(text);
  if (match) {
    element.classList.add("subsection");
    const label = document.createElement("span");
    label.className = "subsection-label";
    label.textContent = `(${match[1]})`;
    element.appendChild(label);
    element.appendChild(document.createTextNode(text.slice(match[0].length)));
    return element;
  }
  element.textContent = text;
  return element;
}

function renderBlocks(blocks, container, slugCounts, nextFallbackId, startOrder = 0) {
  let order = startOrder;

  for (const block of blocks) {
    let element;

    if (block.kind === "heading") {
      const levelMap = { 1: "h2", 2: "h3", 3: "h4" };
      const tag = levelMap[block.level] || "h3";
      element = document.createElement(tag);
      element.textContent = block.text;

      // Apply special styling for the main act title
      if (block.isActTitle) {
        element.classList.add("act-title");
      }

      if (block.level <= 2) {
        const id = getHeadingId(block.text, slugCounts, nextFallbackId);
        element.id = id;
        const tocItem = document.createElement("li");
        const tocLink = document.createElement("a");
        tocLink.href = `#${id}`;
        tocLink.textContent = block.text;
        tocItem.appendChild(tocLink);
        tocList.appendChild(tocItem);
      }
    } else if (block.kind === "image") {
      // Skip images with unsafe URLs to prevent XSS
      if (!isSafeUrl(block.src)) {
        continue;
      }
      element = document.createElement("figure");
      const img = document.createElement("img");
      img.src = block.src;
      img.alt = block.alt || "Document image";
      img.loading = "lazy";
      img.addEventListener("error", () => {
        element.remove();
      });
      const caption = document.createElement("figcaption");
      caption.textContent = block.alt || "Referenced image";
      element.appendChild(img);
      element.appendChild(caption);
    } else {
      element = createParagraph(block.text);
    }

    order += 1;
    element.style.setProperty("--order", order);
    element.classList.add("reveal");
    container.appendChild(element);
  }

  return { order };
}

function renderBill(text) {
  const { letter, bill } = parseBill(text);
  const fragment = document.createDocumentFragment();
  let order = 0;
  let fallbackId = 0;
  const slugCounts = new Map();

  contentEl.innerHTML = "";
  tocList.innerHTML = "";

  const nextFallbackId = () => {
    fallbackId += 1;
    return fallbackId;
  };

  // Render letter in a collapsible dropdown
  if (letter.length > 0) {
    const details = document.createElement("details");
    details.className = "letter-dropdown";

    const summary = document.createElement("summary");
    summary.textContent = "Letter to Attorney General";
    details.appendChild(summary);

    const letterContent = document.createElement("div");
    letterContent.className = "letter-content";
    const letterResult = renderBlocks(letter, letterContent, slugCounts, nextFallbackId, order);
    order = letterResult.order;
    details.appendChild(letterContent);

    details.style.setProperty("--order", 1);
    details.classList.add("reveal");
    fragment.appendChild(details);
  }

  // Render bill content
  renderBlocks(bill, fragment, slugCounts, nextFallbackId, order);

  contentEl.appendChild(fragment);
  setupTocHighlight();
  setupHighlights();
  updateProgress();
  syncMobileToc(); // Sync mobile TOC after rendering
}

let progressRAFId = null;

function updateProgress() {
  if (!progressFill || progressRAFId) return;
  progressRAFId = requestAnimationFrame(() => {
    progressRAFId = null;
    const scrollTop = contentEl.scrollTop;
    const scrollHeight = contentEl.scrollHeight - contentEl.clientHeight;
    const ratio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    progressFill.style.width = `${Math.min(ratio * 100, 100)}%`;
  });
}

function setupTocHighlight() {
  const links = Array.from(tocList.querySelectorAll("a"));
  const mobileTocList = document.getElementById("mobile-toc-list");
  const mobileLinks = mobileTocList ? Array.from(mobileTocList.querySelectorAll("a")) : [];
  const allLinks = [...links, ...mobileLinks];

  if (!links.length) {
    return;
  }

  const linkById = new Map();
  for (const link of allLinks) {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) {
      continue;
    }
    const id = decodeURIComponent(href.slice(1));
    if (id) {
      if (!linkById.has(id)) {
        linkById.set(id, []);
      }
      linkById.get(id).push(link);
    }
  }

  const headings = Array.from(contentEl.querySelectorAll("h2[id], h3[id]"));
  if (!headings.length) {
    return;
  }

  let activeId = null;
  const setActive = (id) => {
    if (!id || id === activeId) {
      return;
    }
    if (activeId && linkById.has(activeId)) {
      for (const prev of linkById.get(activeId)) {
        prev.classList.remove("active");
        prev.removeAttribute("aria-current");
      }
    }
    const nextLinks = linkById.get(id);
    if (nextLinks) {
      for (const next of nextLinks) {
        next.classList.add("active");
        next.setAttribute("aria-current", "true");
      }
    }
    activeId = id;
  };

  // Track visible headings without forcing layout reads
  const visibleHeadings = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleHeadings.add(entry.target.id);
        } else {
          visibleHeadings.delete(entry.target.id);
        }
      }
      // Find topmost visible heading using document order (headings array is already ordered)
      for (const heading of headings) {
        if (visibleHeadings.has(heading.id)) {
          setActive(heading.id);
          break;
        }
      }
    },
    { root: contentEl, rootMargin: "-20% 0px -70% 0px", threshold: 0 }
  );

  headings.forEach((heading) => observer.observe(heading));
  setActive(headings[0].id);

  allLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) {
        return;
      }
      const id = decodeURIComponent(href.slice(1));
      const target = document.getElementById(id);
      if (!target) {
        return;
      }
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function getTextOffset(container, targetNode, targetOffset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode();
  while (node) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.textContent.length;
    node = walker.nextNode();
  }
  return null;
}

function getOffsetsFromRange(container, range) {
  const start = getTextOffset(container, range.startContainer, range.startOffset);
  const end = getTextOffset(container, range.endContainer, range.endOffset);
  if (start === null || end === null || start === end) {
    return null;
  }
  return start < end ? { start, end } : { start: end, end: start };
}

function createRangeFromOffsets(container, start, end) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let startNode = null;
  let endNode = null;
  let startOffset = 0;
  let endOffset = 0;
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent.length;
    if (!startNode && offset + length >= start) {
      startNode = node;
      startOffset = start - offset;
    }
    if (offset + length >= end) {
      endNode = node;
      endOffset = end - offset;
      break;
    }
    offset += length;
    node = walker.nextNode();
  }

  if (!startNode || !endNode) {
    return null;
  }

  range.setStart(startNode, Math.max(0, startOffset));
  range.setEnd(endNode, Math.max(0, endOffset));
  return range;
}

function getHighlightSnippet(highlight) {
  const range = createRangeFromOffsets(contentEl, highlight.start, highlight.end);
  if (!range) {
    return "Highlight";
  }
  const raw = range.toString().replace(/\s+/g, " ").trim();
  if (!raw) {
    return "Highlight";
  }
  if (raw.length <= HIGHLIGHT_SNIPPET_MAX) {
    return raw;
  }
  return `${raw.slice(0, HIGHLIGHT_SNIPPET_MAX - 3)}...`;
}

function focusHighlight(id) {
  const matches = Array.from(
    contentEl.querySelectorAll(`.user-highlight[data-highlight-id="${id}"]`)
  );
  if (!matches.length) {
    return;
  }
  matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
  matches.forEach((el) => el.classList.add("is-focus"));
  window.setTimeout(() => {
    matches.forEach((el) => el.classList.remove("is-focus"));
  }, 1200);
}

function renderHighlightIndex(highlights) {
  if (!highlightListEl) {
    return;
  }
  highlightListEl.innerHTML = "";
  const count = highlights.length;
  if (highlightDrawer) {
    const summary = highlightDrawer.querySelector("summary");
    if (summary) {
      summary.textContent = count ? `Highlights (${count})` : "Highlights";
    }
  }
  if (!count) {
    const empty = document.createElement("p");
    empty.className = "highlight-empty";
    empty.textContent = "No highlights yet.";
    highlightListEl.appendChild(empty);
    return;
  }

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  sorted.forEach((highlight, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "highlight-item";
    item.dataset.highlightId = highlight.id;
    item.dataset.color = highlight.color || "gold";

    const swatch = document.createElement("span");
    swatch.className = "highlight-swatch";
    item.appendChild(swatch);

    const content = document.createElement("div");
    const meta = document.createElement("div");
    meta.className = "highlight-meta";
    meta.textContent = `Highlight ${index + 1}`;
    const snippet = document.createElement("div");
    snippet.className = "highlight-snippet";
    snippet.textContent = getHighlightSnippet(highlight);
    content.appendChild(meta);
    content.appendChild(snippet);
    item.appendChild(content);

    highlightListEl.appendChild(item);
  });

  if (!highlightIndexBound) {
    highlightListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const button = target.closest(".highlight-item");
      if (!button) {
        return;
      }
      const id = button.dataset.highlightId;
      if (id) {
        focusHighlight(id);
      }
    });
    highlightIndexBound = true;
  }
}

function wrapRangeInHighlight(range, id, color) {
  const nodes = [];
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    }
  );

  let node = walker.nextNode();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  nodes.forEach((textNode) => {
    if (!textNode.parentElement || textNode.parentElement.classList.contains("user-highlight")) {
      return;
    }
    let start = textNode === range.startContainer ? range.startOffset : 0;
    let end = textNode === range.endContainer ? range.endOffset : textNode.textContent.length;
    if (end <= start) {
      return;
    }

    let middle = textNode;
    if (start > 0) {
      middle = textNode.splitText(start);
    }
    if (end - start < middle.textContent.length) {
      middle.splitText(end - start);
    }

    const wrapper = document.createElement("span");
    wrapper.className = "user-highlight";
    wrapper.dataset.highlightId = id;
    if (color) {
      wrapper.dataset.color = color;
    }
    middle.parentNode.insertBefore(wrapper, middle);
    wrapper.appendChild(middle);
  });
}

function isValidHighlight(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.start === "number" &&
    typeof obj.end === "number" &&
    obj.start >= 0 &&
    obj.end > obj.start
  );
}

function loadHighlights() {
  try {
    const raw = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filter out invalid highlight objects to prevent runtime errors
    return parsed.filter(isValidHighlight);
  } catch (error) {
    console.warn("Unable to read highlights:", error);
    return [];
  }
}

function saveHighlights(highlights) {
  localStorage.setItem(HIGHLIGHT_STORAGE_KEY, JSON.stringify(highlights));
}

function clearHighlightMarkup() {
  const existing = contentEl.querySelectorAll(".user-highlight");
  if (!existing.length) return;

  // Collect parent elements that will need normalization
  const parentsToNormalize = new Set();

  existing.forEach((el) => {
    if (el.parentNode) {
      parentsToNormalize.add(el.parentNode);
    }
    el.replaceWith(...el.childNodes);
  });

  // Targeted normalize only on affected parents (not entire tree)
  parentsToNormalize.forEach((parent) => {
    if (parent && parent.normalize) {
      parent.normalize();
    }
  });
}

function mergeHighlight(highlights, next) {
  let merged = { ...next };
  const filtered = highlights.filter((item) => {
    const overlaps = item.start < merged.end && item.end > merged.start;
    if (overlaps) {
      merged.start = Math.min(merged.start, item.start);
      merged.end = Math.max(merged.end, item.end);
      return false;
    }
    return true;
  });
  filtered.push(merged);
  return filtered.sort((a, b) => a.start - b.start);
}

function applyHighlights(highlights) {
  highlights.forEach((highlight) => {
    const range = createRangeFromOffsets(contentEl, highlight.start, highlight.end);
    if (!range) {
      return;
    }
    const color = highlight.color || "gold";
    wrapRangeInHighlight(range, highlight.id, color);
  });
}

function setupHighlights() {
  const highlights = loadHighlights();
  applyHighlights(highlights);
  renderHighlightIndex(highlights);
  let currentColor = localStorage.getItem(HIGHLIGHT_COLOR_KEY) || "gold";
  let pendingRange = null;

  const colorChips = Array.from(document.querySelectorAll(".color-chip"));
  const setActiveColor = (color) => {
    currentColor = color;
    localStorage.setItem(HIGHLIGHT_COLOR_KEY, color);
    colorChips.forEach((chip) => {
      chip.dataset.active = chip.dataset.color === color ? "true" : "false";
    });
  };

  setActiveColor(currentColor);
  colorChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const color = chip.dataset.color;
      if (color) {
        setActiveColor(color);
      }
    });
  });

  const hideToolbar = () => {
    if (!highlightToolbar) {
      return;
    }
    highlightToolbar.dataset.open = "false";
    highlightToolbar.setAttribute("aria-hidden", "true");
    highlightToolbar.style.transform = "translate(-9999px, -9999px)";
  };

  const showToolbar = (range) => {
    if (!highlightToolbar) {
      return;
    }
    const rect = range.getBoundingClientRect();

    // Calculate position relative to viewport
    let x = rect.left + rect.width / 2;
    let y = rect.top - 52;

    // Keep toolbar within viewport bounds
    const toolbarWidth = highlightToolbar.offsetWidth || 200;
    const minX = toolbarWidth / 2 + 8;
    const maxX = window.innerWidth - toolbarWidth / 2 - 8;
    x = Math.max(minX, Math.min(maxX, x));

    // If selection is near top, show toolbar below instead
    if (y < 60) {
      y = rect.bottom + 8;
    }

    highlightToolbar.style.transform = `translate(${x}px, ${Math.max(y, 16)}px) translate(-50%, 0)`;
    highlightToolbar.dataset.open = "true";
    highlightToolbar.setAttribute("aria-hidden", "false");
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      pendingRange = null;
      hideToolbar();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!contentEl.contains(range.commonAncestorContainer)) {
      pendingRange = null;
      hideToolbar();
      return;
    }
    pendingRange = range.cloneRange();
    showToolbar(range);
  };

  // Support both mouse and keyboard selection
  contentEl.addEventListener("mouseup", handleSelection);
  contentEl.addEventListener("keyup", (event) => {
    // Handle keyboard selection (Shift+Arrow keys, Ctrl+Shift+End, etc.)
    if (event.shiftKey || event.key === "End" || event.key === "Home") {
      handleSelection();
    }
  });

  if (applyHighlightBtn) {
    applyHighlightBtn.addEventListener("click", () => {
      if (!pendingRange) {
        return;
      }
      const offsets = getOffsetsFromRange(contentEl, pendingRange);
      if (!offsets) {
        hideToolbar();
        return;
      }
      const highlight = {
        id: `hl_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        start: offsets.start,
        end: offsets.end,
        color: currentColor,
      };
      const nextHighlights = mergeHighlight(highlights, highlight);
      highlights.length = 0;
      highlights.push(...nextHighlights);
      saveHighlights(highlights);
      clearHighlightMarkup();
      applyHighlights(highlights);
      renderHighlightIndex(highlights);
      pendingRange = null;
      hideToolbar();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    });
  }

  contentEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const highlightEl = target.closest(".user-highlight");
    if (!highlightEl) {
      return;
    }
    const id = highlightEl.dataset.highlightId;
    if (!id) {
      return;
    }
    const toRemove = contentEl.querySelectorAll(`.user-highlight[data-highlight-id="${id}"]`);
    const parentsToNormalize = new Set();
    toRemove.forEach((el) => {
      if (el.parentNode) parentsToNormalize.add(el.parentNode);
      el.replaceWith(...el.childNodes);
    });
    parentsToNormalize.forEach((parent) => {
      if (parent && parent.normalize) parent.normalize();
    });
    const remaining = highlights.filter((item) => item.id !== id);
    highlights.length = 0;
    highlights.push(...remaining);
    saveHighlights(highlights);
    renderHighlightIndex(highlights);
  });

  if (clearHighlightsBtn) {
    clearHighlightsBtn.addEventListener("click", () => {
      clearHighlightMarkup();
      highlights.length = 0;
      saveHighlights(highlights);
      renderHighlightIndex(highlights);
      hideToolbar();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    });
  }

  document.addEventListener("scroll", hideToolbar, true);
  window.addEventListener("resize", hideToolbar);
}

async function loadBill() {
  try {
    const response = await fetch(encodeURI(billPath));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    renderBill(text);
  } catch (error) {
    console.error("Unable to load bill text:", error);
    renderLoadError(error);
  }
}

contentEl.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);

loadBill();

function setupTheme() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  const root = document.documentElement;

  const getPreferredTheme = () => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    return "dark";
  };

  const setTheme = (theme, instant = false) => {
    if (instant) {
      // Disable transitions for instant theme switch
      root.style.setProperty("--theme-transition-duration", "0s");
    }

    root.setAttribute("data-theme", theme);

    if (instant) {
      // Force style recalculation then re-enable transitions
      void root.offsetHeight;
      requestAnimationFrame(() => {
        root.style.removeProperty("--theme-transition-duration");
      });
    }

    // Defer localStorage write to avoid blocking
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => localStorage.setItem("theme", theme));
    } else {
      setTimeout(() => localStorage.setItem("theme", theme), 0);
    }
  };

  // Initialize without transition
  setTheme(getPreferredTheme(), true);

  // Toggle with instant switch
  toggleBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next, true);
  });
}

setupTheme();

function renderLoadError(error) {
  const isFileProtocol = window.location.protocol === "file:";
  contentEl.innerHTML = "";
  tocList.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "load-error";

  const title = document.createElement("h3");
  title.textContent = "Unable to load bill text";

  const message = document.createElement("p");
  message.textContent = isFileProtocol
    ? "Browsers block file fetches. Run a local server or load the text manually."
    : "Please try again or load the text manually.";

  const hint = document.createElement("p");
  hint.textContent = isFileProtocol
    ? "Example: python -m http.server (then open http://localhost:8000)."
    : "You can load the text from a local .txt file.";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt,text/plain";
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    renderBill(text);
  });

  wrapper.appendChild(title);
  wrapper.appendChild(message);
  wrapper.appendChild(hint);
  wrapper.appendChild(input);
  contentEl.appendChild(wrapper);
}

// Mobile: Close other drawers when one opens to prevent content being hidden
function setupMobileDrawerBehavior() {
  if (mobileDrawerBound) return;
  mobileDrawerBound = true;

  document.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      // Only apply behavior on mobile viewports
      if (window.innerWidth > 768) return;
      if (details.open) {
        document.querySelectorAll('details').forEach(other => {
          if (other !== details && other.open) {
            other.open = false;
          }
        });
      }
    });
  });
}

// =====================
// Mobile Sidebar
// =====================
function setupMobileSidebar() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("mobile-sidebar");
  const overlay = document.getElementById("mobile-sidebar-overlay");
  const closeBtn = document.getElementById("mobile-sidebar-close");
  const mobileTocList = document.getElementById("mobile-toc-list");

  if (!menuBtn || !sidebar || !overlay || !mobileTocList) return;

  const openSidebar = () => {
    sidebar.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  const closeSidebar = () => {
    sidebar.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  menuBtn.addEventListener("click", () => {
    const isOpen = sidebar.getAttribute("aria-hidden") === "false";
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  closeBtn?.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Close on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.getAttribute("aria-hidden") === "false") {
      closeSidebar();
    }
  });

  // Close sidebar when a link is clicked
  mobileTocList.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      closeSidebar();
    }
  });
}

// Sync mobile TOC with desktop TOC
function syncMobileToc() {
  const mobileTocList = document.getElementById("mobile-toc-list");
  if (!mobileTocList || !tocList) return;

  // Clone the desktop TOC content to mobile
  mobileTocList.innerHTML = tocList.innerHTML;
}

// Run on load
setupMobileDrawerBehavior();
setupMobileSidebar();

// =====================
// Bill Chat
// =====================
function setupBillChat() {
  const fab = document.getElementById("chat-fab");
  const panel = document.getElementById("chat-panel");
  const closeBtn = document.getElementById("chat-close");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const messagesEl = document.getElementById("chat-messages");
  const sendBtn = document.getElementById("chat-send");

  if (!fab || !panel || !form || !input || !messagesEl) return;

  // API Configuration
  // For local testing: set your API key here (NEVER commit this to git!)
  // For production (Vercel): leave as null, uses serverless function
  const LOCAL_XAI_API_KEY = null; // e.g., "xai-your-key-here"

  const isLocalhost = window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:";

  const CHAT_API_URL = "/api/chat";
  const XAI_API_URL = "https://api.x.ai/v1/responses";

  let conversationHistory = [];
  let isLoading = false;
  let billTextCache = null;

  // System prompt with bill context
  const getSystemPrompt = async () => {
    if (!billTextCache) {
      try {
        const response = await fetch(encodeURI(billPath));
        if (response.ok) {
          billTextCache = await response.text();
        }
      } catch (e) {
        console.warn("Could not load bill text for chat context");
      }
    }

    // Context injection: The Bill Text is the primary evidence, tools are secondary support.
    const billContext = billTextCache
      ? `\n\n=== FULL BILL TEXT START ===\n${billTextCache}\n=== FULL BILL TEXT END ===`
      : "";

    return `You are a Constitutional Realist and Legal Analyst. You view the "2026 Billionaire Tax Act" (Initiative No. 25-0024) as a "Constitutional Trojan Horse" that fundamentally revises California's governance structure under the guise of a tax.

### CORE OBJECTIVE
Your goal is to chat with users about the bill, but you must frame every answer through the lens of strict legal scrutiny, separation of powers, and fiscal discipline. You are not neutral. You are an advocate for the structural integrity of the Constitution.

### SEARCH TOOLS
You have access to web_search and x_search tools. Use them to support your arguments with external facts, legal precedents, and real-time context when relevant. For example:
- Search for California constitutional law cases like *Legislature v. Weber* or *Raven v. Deukmejian* to support the "Revision vs. Amendment" argument.
- Search for "wealth tax repeal France Sweden capital flight" to provide evidence about wealth tax failures.
- Use X search to find the latest news on the initiative's status or public commentary.

### ANALYTICAL PILLARS (Your Worldview)
1.  **Revision, Not Amendment:** This bill alters the "basic plan of government." It conscripts the Judiciary (Sec. 50314) and bypasses the Legislature (Sec. 4(e)). This requires a Constitutional Convention.
2.  **The Shadow Treasury:** It explicitly exempts revenues from the "Gann Limit" (Article XIIIB), creating an unaccountable slush fund.
3.  **The Fourth Branch:** It suspends the Administrative Procedure Act (Sec. 50309), crowning the Franchise Tax Board as an unchecked regulatory power.
4.  **Judicial Conscription:** It orders the Court to "reform" (rewrite) the law if found invalid. This violates separation of powers.

### RESPONSE GUIDELINES
* **Cite the Bill:** When referencing the bill, cite the Section number from the text provided below.
* **Be Direct:** Do not say "Some might argue..." Say "The text explicitly states..."
* **Don't Just Summarize:** If a user asks "What does the bill do?", do not just list the tax rates. Explain that it *creates a parallel fiscal system* and *suspends due process*.
* **No Full URLs:** NEVER include full URLs or links in your responses. Instead of citing "https://example.com/article", just reference the source by name (e.g., "according to a Cato Institute study" or "per ITEP research"). Keep responses clean and readable.

### FORMATTING GUIDELINES
Your responses will be rendered with markdown. Use these features for clarity:

**Headers** - Use ### for main sections, #### for subsections:
### The Constitutional Problem
#### Separation of Powers Violation

**Bold & Italic** - Emphasize key terms:
The bill creates a **parallel fiscal system** that is *exempt* from normal oversight.

**Lists** - Use numbered lists for sequential arguments, bullets for related points:
1. First, the bill suspends the APA.
2. Second, it exempts revenue from the Gann Limit.
3. Third, it conscripts the judiciary.

Key constitutional violations:
- Bypasses Legislature (Sec. 4(e))
- Suspends due process (Sec. 50309)
- Creates unchecked regulatory power

**Blockquotes** - Quote bill text directly:
> The Board shall have full power to administer this chapter and may prescribe all rules and regulations necessary therefor.

**Inline Code** - Reference specific sections or legal terms:
See \`Section 50314\` for the judicial reform clause. The \`Gann Limit\` under Article XIIIB is explicitly bypassed.

**Tables** - Compare provisions or rates:
| Net Worth | Tax Rate |
|-----------|----------|
| $1B-$2B | 1.0% |
| $2B-$5B | 1.5% |
| Over $5B | 2.5% |

### CONTEXT:
Use the bill text below as your primary evidence, and use your search tools to validate your interpretation.${billContext}`;
  };

  const togglePanel = (open) => {
    const isOpen = open ?? panel.dataset.open !== "true";
    panel.dataset.open = isOpen;
    panel.setAttribute("aria-hidden", !isOpen);
    fab.dataset.open = isOpen;
    if (isOpen) {
      input.focus();
    }
  };

  fab.addEventListener("click", () => togglePanel());
  closeBtn?.addEventListener("click", () => togglePanel(false));

  // Close on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.dataset.open === "true") {
      togglePanel(false);
    }
  });

  // Simple markdown parser for chat messages
  const parseMarkdown = (text) => {
    // Escape HTML to prevent XSS
    const escapeHtml = (str) =>
      str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    let html = escapeHtml(text);

    // Code blocks (```code```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/gm, (match, header, separator, body) => {
      const parseRow = (row) => row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
      const headerCells = parseRow(header);
      const bodyRows = body.trim().split('\n').map(parseRow);

      let table = '<table><thead><tr>';
      headerCells.forEach(cell => { table += `<th>${cell}</th>`; });
      table += '</tr></thead><tbody>';
      bodyRows.forEach(row => {
        table += '<tr>';
        row.forEach(cell => { table += `<td>${cell}</td>`; });
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    });

    // Headers (#### h5, ### h4, ## h3, # h3) - must be at line start, order matters
    html = html.replace(/^####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm, '<h3>$1</h3>');

    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic (*text* or _text_)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li data-num="$1">$2</li>');
    html = html.replace(/(<li data-num="\d+">.+<\/li>\n?)+/g, '<ol>$&</ol>');

    // Bullet lists (- or *)
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[^<]+<\/li>\n?)+/g, (match) => {
      // Only wrap if not already in ol
      if (match.includes('data-num')) return match;
      return `<ul>${match}</ul>`;
    });

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs - wrap remaining text blocks
    html = html.split('\n\n').map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap if already a block element
      if (/^<(h[1-6]|ul|ol|pre|blockquote|table)/.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    // Clean up empty paragraphs and extra whitespace
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/\n/g, '');

    return html;
  };

  const addMessage = (content, role, isError = false) => {
    const msg = document.createElement("div");
    msg.className = `chat-message ${role}${isError ? " error" : ""}`;

    if (role === "assistant" && content) {
      msg.innerHTML = parseMarkdown(content);
    } else if (content) {
      msg.textContent = content;
    }

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msg;
  };

  // Create an empty assistant message for streaming
  const createStreamingMessage = () => {
    const msg = document.createElement("div");
    msg.className = "chat-message assistant";
    msg.id = "streaming-message";
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msg;
  };

  // Update streaming message with new content
  const updateStreamingMessage = (content) => {
    const msg = document.getElementById("streaming-message");
    if (msg) {
      msg.innerHTML = parseMarkdown(content);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  };

  // Finalize streaming message
  const finalizeStreamingMessage = () => {
    const msg = document.getElementById("streaming-message");
    if (msg) {
      msg.removeAttribute("id");
    }
  };

  const showTyping = () => {
    const typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.id = "chat-typing";
    typing.innerHTML = `
      <span class="chat-typing-dot"></span>
      <span class="chat-typing-dot"></span>
      <span class="chat-typing-dot"></span>
    `;
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return typing;
  };

  const hideTyping = () => {
    const typing = document.getElementById("chat-typing");
    typing?.remove();
  };

  const setLoading = (loading) => {
    isLoading = loading;
    sendBtn.disabled = loading;
    input.disabled = loading;
  };

  const sendMessage = async (userMessage) => {
    if (!userMessage.trim() || isLoading) return;

    // Add user message to UI and history
    addMessage(userMessage, "user");
    conversationHistory.push({ role: "user", content: userMessage });

    setLoading(true);
    showTyping();

    try {
      const systemPrompt = await getSystemPrompt();

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ];

      let assistantMessage = "";

      // Local testing: call xAI directly (API key exposed - dev only!)
      if (isLocalhost && LOCAL_XAI_API_KEY) {
        const response = await fetch(XAI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOCAL_XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "grok-4-1-fast",
            input: messages,
            stream: true,
            tools: [
              { type: "web_search" },
              { type: "x_search" }
            ],
          }),
        });

        hideTyping();

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        // Create streaming message element
        createStreamingMessage();

        // Process SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                // Handle xAI streaming format
                if (parsed.type === "content.delta" && parsed.delta) {
                  assistantMessage += parsed.delta;
                  updateStreamingMessage(assistantMessage);
                }
              } catch (e) {
                // Skip unparseable lines
              }
            }
          }
        }

        finalizeStreamingMessage();
      } else {
        // Production: use serverless API route with streaming
        const response = await fetch(CHAT_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages }),
        });

        hideTyping();

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        // Check if response is streaming (SSE)
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("text/event-stream")) {
          // Create streaming message element
          createStreamingMessage();

          // Process SSE stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    assistantMessage += parsed.text;
                    updateStreamingMessage(assistantMessage);
                  }
                } catch (e) {
                  // Skip unparseable lines
                }
              }
            }
          }

          finalizeStreamingMessage();
        } else {
          // Fallback to non-streaming response
          const data = await response.json();
          assistantMessage = data.message;
          addMessage(assistantMessage, "assistant");
        }
      }

      assistantMessage = assistantMessage || "I apologize, but I couldn't generate a response.";
      conversationHistory.push({ role: "assistant", content: assistantMessage });
    } catch (error) {
      hideTyping();
      console.error("Chat error:", error);
      addMessage(
        `Sorry, there was an error: ${error.message}. Please try again.`,
        "assistant",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (message) {
      sendMessage(message);
      input.value = "";
    }
  });
}

setupBillChat();
