// Highlighting system

const HIGHLIGHT_STORAGE_KEY = "billHighlights:v1";
const HIGHLIGHT_COLOR_KEY = "billHighlightColor:v1";
const HIGHLIGHT_SNIPPET_MAX = 140;

let highlightIndexBound = false;

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

function getHighlightSnippet(highlight, contentEl) {
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

function focusHighlight(id, contentEl) {
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

function renderHighlightIndex(highlights, contentEl, highlightListEl, highlightDrawer) {
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
        snippet.textContent = getHighlightSnippet(highlight, contentEl);
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
                focusHighlight(id, contentEl);
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
        return parsed.filter(isValidHighlight);
    } catch (error) {
        console.warn("Unable to read highlights:", error);
        return [];
    }
}

function saveHighlights(highlights) {
    localStorage.setItem(HIGHLIGHT_STORAGE_KEY, JSON.stringify(highlights));
}

function clearHighlightMarkup(contentEl) {
    const existing = contentEl.querySelectorAll(".user-highlight");
    if (!existing.length) return;

    const parentsToNormalize = new Set();

    existing.forEach((el) => {
        if (el.parentNode) {
            parentsToNormalize.add(el.parentNode);
        }
        el.replaceWith(...el.childNodes);
    });

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

function applyHighlights(highlights, contentEl) {
    highlights.forEach((highlight) => {
        const range = createRangeFromOffsets(contentEl, highlight.start, highlight.end);
        if (!range) {
            return;
        }
        const color = highlight.color || "gold";
        wrapRangeInHighlight(range, highlight.id, color);
    });
}

export function setupHighlights(contentEl, highlightToolbar, applyHighlightBtn, clearHighlightsBtn, highlightDrawer, highlightListEl) {
    const highlights = loadHighlights();
    applyHighlights(highlights, contentEl);
    renderHighlightIndex(highlights, contentEl, highlightListEl, highlightDrawer);
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

        let x = rect.left + rect.width / 2;
        let y = rect.top - 52;

        const toolbarWidth = highlightToolbar.offsetWidth || 200;
        const minX = toolbarWidth / 2 + 8;
        const maxX = window.innerWidth - toolbarWidth / 2 - 8;
        x = Math.max(minX, Math.min(maxX, x));

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

    contentEl.addEventListener("mouseup", handleSelection);
    contentEl.addEventListener("keyup", (event) => {
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
            clearHighlightMarkup(contentEl);
            applyHighlights(highlights, contentEl);
            renderHighlightIndex(highlights, contentEl, highlightListEl, highlightDrawer);
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
        renderHighlightIndex(highlights, contentEl, highlightListEl, highlightDrawer);
    });

    if (clearHighlightsBtn) {
        clearHighlightsBtn.addEventListener("click", () => {
            clearHighlightMarkup(contentEl);
            highlights.length = 0;
            saveHighlights(highlights);
            renderHighlightIndex(highlights, contentEl, highlightListEl, highlightDrawer);
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
