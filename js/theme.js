// Theme toggle functionality

export function setupTheme() {
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
            root.style.setProperty("--theme-transition-duration", "0s");
        }

        root.setAttribute("data-theme", theme);

        if (instant) {
            void root.offsetHeight;
            requestAnimationFrame(() => {
                root.style.removeProperty("--theme-transition-duration");
            });
        }

        if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => localStorage.setItem("theme", theme));
        } else {
            setTimeout(() => localStorage.setItem("theme", theme), 0);
        }
    };

    setTheme(getPreferredTheme(), true);

    toggleBtn.addEventListener("click", () => {
        const current = root.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        setTheme(next, true);
    });
}
