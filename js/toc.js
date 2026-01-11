/* Table of Contents Module */

function setupTocHighlight(contentEl, tocList) {
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

      // Close mobile TOC drawer if open
      if (window.MobileToc && typeof window.MobileToc.close === 'function') {
        window.MobileToc.close();
      }
    });
  });
}

// Export for use in other modules
window.TocHighlight = {
  setupTocHighlight
};
