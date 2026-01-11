/* Main Application Module */

const billPath = "billionaires tax.txt";

const contentEl = document.getElementById("bill-content");
const tocList = document.getElementById("toc-list");
const progressFill = document.getElementById("progress-fill");
const highlightToolbar = document.getElementById("highlight-toolbar");
const applyHighlightBtn = document.getElementById("apply-highlight");
const clearHighlightsBtn = document.getElementById("clear-highlights");
const highlightDrawer = document.getElementById("highlight-drawer");
const highlightListEl = document.getElementById("highlight-list");

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

function renderBill(text) {
  const { letter, bill } = window.BillParser.parseBill(text);
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
    const letterResult = window.BillParser.renderBlocks(letter, letterContent, slugCounts, nextFallbackId, tocList, order);
    order = letterResult.order;
    details.appendChild(letterContent);

    details.style.setProperty("--order", 1);
    details.classList.add("reveal");
    fragment.appendChild(details);
  }

  // Render bill content
  window.BillParser.renderBlocks(bill, fragment, slugCounts, nextFallbackId, tocList, order);

  contentEl.appendChild(fragment);
  window.TocHighlight.setupTocHighlight(contentEl, tocList);
  window.Highlights.setupHighlights(contentEl, highlightToolbar, applyHighlightBtn, clearHighlightsBtn, highlightDrawer, highlightListEl);
  updateProgress();

  // Re-bind TOC links for mobile close behavior
  if (window.MobileToc) {
    const tocLinks = document.querySelectorAll('.toc a');
    tocLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768 && window.MobileToc.close) {
          window.MobileToc.close();
        }
      });
    });
  }
}

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

// Event listeners
contentEl.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);

// Initialize
window.Theme.setupTheme();
loadBill();
