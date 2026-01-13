// Main entry point - imports and initializes all modules

import { BILL_PATH } from './config.js';
import { parseBill, renderBlocks } from './bill-parser.js';
import { setupHighlights } from './highlights.js';
import { setupTocHighlight, syncMobileToc } from './toc.js';
import { setupTheme } from './theme.js';
import { setupMobileDrawerBehavior, setupMobileSidebar } from './mobile.js';
import { setupBillChat } from './chat.js';
import { setupFaq } from './faq.js';

// DOM Elements
const contentEl = document.getElementById("bill-content");
const tocList = document.getElementById("toc-list");
const progressFill = document.getElementById("progress-fill");
const highlightToolbar = document.getElementById("highlight-toolbar");
const applyHighlightBtn = document.getElementById("apply-highlight");
const clearHighlightsBtn = document.getElementById("clear-highlights");
const highlightDrawer = document.getElementById("highlight-drawer");
const highlightListEl = document.getElementById("highlight-list");

// Progress bar
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

// Render bill content
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
        const letterResult = renderBlocks(letter, letterContent, tocList, slugCounts, nextFallbackId, order);
        order = letterResult.order;
        details.appendChild(letterContent);

        details.style.setProperty("--order", 1);
        details.classList.add("reveal");
        fragment.appendChild(details);
    }

    // Render bill content
    renderBlocks(bill, fragment, tocList, slugCounts, nextFallbackId, order);

    contentEl.appendChild(fragment);
    setupTocHighlight(contentEl, tocList);
    setupHighlights(contentEl, highlightToolbar, applyHighlightBtn, clearHighlightsBtn, highlightDrawer, highlightListEl);
    updateProgress();
    syncMobileToc(tocList);
}

// Load bill error handler
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

// Load bill
async function loadBill() {
    try {
        const response = await fetch(encodeURI(BILL_PATH));
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

// Initialize
function init() {
    // Setup event listeners
    contentEl.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    // Load bill
    loadBill();

    // Setup features
    setupTheme();
    setupMobileDrawerBehavior();
    setupMobileSidebar();
    setupBillChat();
    setupFaq();
}

// Run initialization
init();
