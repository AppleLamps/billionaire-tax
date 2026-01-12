// Table of contents functionality

export function setupTocHighlight(contentEl, tocList) {
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

export function syncMobileToc(tocList) {
    const mobileTocList = document.getElementById("mobile-toc-list");
    if (!mobileTocList || !tocList) return;
    mobileTocList.innerHTML = tocList.innerHTML;
}
