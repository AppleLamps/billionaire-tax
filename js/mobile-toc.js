/* Mobile TOC Drawer Module */

let isInitialized = false;

function setupMobileToc() {
  if (isInitialized) return;
  isInitialized = true;

  const tocToggle = document.getElementById('toc-toggle');
  const tocDrawer = document.querySelector('.toc');
  const tocOverlay = document.querySelector('.toc-overlay');
  const tocClose = document.getElementById('toc-close');

  if (!tocToggle || !tocDrawer) {
    console.warn('Mobile TOC elements not found');
    return;
  }

  function openDrawer() {
    tocDrawer.classList.add('is-open');
    if (tocOverlay) tocOverlay.classList.add('is-visible');
    document.body.classList.add('toc-drawer-open');
    tocToggle.setAttribute('aria-expanded', 'true');

    // Focus first link in TOC for accessibility
    const firstLink = tocDrawer.querySelector('a');
    if (firstLink) {
      setTimeout(() => firstLink.focus(), 100);
    }
  }

  function closeDrawer() {
    tocDrawer.classList.remove('is-open');
    if (tocOverlay) tocOverlay.classList.remove('is-visible');
    document.body.classList.remove('toc-drawer-open');
    tocToggle.setAttribute('aria-expanded', 'false');
    tocToggle.focus();
  }

  function toggleDrawer() {
    const isOpen = tocDrawer.classList.contains('is-open');
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  // Toggle button click
  tocToggle.addEventListener('click', toggleDrawer);

  // Close button inside TOC
  if (tocClose) {
    tocClose.addEventListener('click', closeDrawer);
  }

  // Overlay click to close
  if (tocOverlay) {
    tocOverlay.addEventListener('click', closeDrawer);
  }

  // Escape key to close
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && tocDrawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  // Close drawer when clicking a TOC link on mobile
  const tocLinks = tocDrawer.querySelectorAll('a');
  tocLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeDrawer();
      }
    });
  });

  // Handle resize - close drawer when resizing to desktop
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth > 768 && tocDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    }, 100);
  });

  // Expose close function globally for use by other modules
  window.MobileToc = {
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer
  };
}

// Mobile: Close other drawers when one opens to prevent content being hidden
function setupMobileDrawerBehavior() {
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupMobileToc();
    setupMobileDrawerBehavior();
  });
} else {
  setupMobileToc();
  setupMobileDrawerBehavior();
}
