// Mobile sidebar and drawer functionality

let mobileDrawerBound = false;

export function setupMobileDrawerBehavior() {
    if (mobileDrawerBound) return;
    mobileDrawerBound = true;

    document.querySelectorAll('details').forEach(details => {
        details.addEventListener('toggle', () => {
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

export function setupMobileSidebar() {
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

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.getAttribute("aria-hidden") === "false") {
            closeSidebar();
        }
    });

    mobileTocList.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
            closeSidebar();
        }
    });
}
