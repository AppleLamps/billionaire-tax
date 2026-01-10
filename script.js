const billPath = "billionaires tax.txt";

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
  if (!links.length) {
    return;
  }

  const linkById = new Map();
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) {
      continue;
    }
    const id = decodeURIComponent(href.slice(1));
    if (id) {
      linkById.set(id, link);
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
      const prev = linkById.get(activeId);
      prev.classList.remove("active");
      prev.removeAttribute("aria-current");
    }
    const next = linkById.get(id);
    if (next) {
      next.classList.add("active");
      next.setAttribute("aria-current", "true");
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

  links.forEach((link) => {
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

// Run on load
setupMobileDrawerBehavior();
