/* Theme Toggle Module */

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

// Export for use in other modules
window.Theme = {
  setupTheme
};
