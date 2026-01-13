// FAQ modal functionality

export function setupFaq() {
    const tabBill = document.getElementById('tab-bill');
    const tabFaq = document.getElementById('tab-faq');
    const faqContent = document.getElementById('faq-content');
    const billNote = document.getElementById('bill-note');

    if (!tabFaq || !faqContent) {
        return;
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'faq-modal-overlay';
    modalOverlay.setAttribute('aria-hidden', 'true');

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'faq-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'faq-modal-title');
    modal.setAttribute('aria-modal', 'true');

    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'faq-modal-header';

    const modalTitle = document.createElement('h2');
    modalTitle.id = 'faq-modal-title';
    modalTitle.className = 'faq-modal-title';
    modalTitle.textContent = 'Frequently Asked Questions';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'faq-modal-close';
    closeBtn.setAttribute('aria-label', 'Close FAQ');
    closeBtn.innerHTML = `
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'faq-modal-body';

    // Move FAQ content into modal body
    modalBody.appendChild(faqContent);
    faqContent.hidden = false;
    faqContent.removeAttribute('role');
    faqContent.removeAttribute('aria-labelledby');

    // Assemble modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // Modal state
    let isOpen = false;

    function openModal() {
        isOpen = true;
        modalOverlay.classList.add('open');
        modalOverlay.setAttribute('aria-hidden', 'false');
        modal.focus();
        document.body.style.overflow = 'hidden';
        
        // Update tab state to show FAQ is active
        tabFaq.classList.add('active');
        tabBill.classList.remove('active');
        tabFaq.setAttribute('aria-selected', 'true');
        tabBill.setAttribute('aria-selected', 'false');
        
        // Update note text
        if (billNote) {
            billNote.textContent = 'Analysis of potential concerns with Initiative No. 25-0024.';
        }
    }

    function closeModal() {
        isOpen = false;
        modalOverlay.classList.remove('open');
        modalOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // Reset tab state to bill
        tabBill.classList.add('active');
        tabFaq.classList.remove('active');
        tabBill.setAttribute('aria-selected', 'true');
        tabFaq.setAttribute('aria-selected', 'false');
        
        // Reset note text
        if (billNote) {
            billNote.textContent = 'Rendered directly from the source file for accuracy.';
        }
        
        tabFaq.focus();
    }

    // Event listeners
    tabFaq.addEventListener('click', () => {
        if (!isOpen) {
            openModal();
        }
    });

    // Keep Bill Text tab always showing bill content (no toggle needed since it's always visible)
    tabBill.addEventListener('click', () => {
        if (isOpen) {
            closeModal();
        }
    });

    closeBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeModal();
        }
    });

    // Tab keyboard navigation
    function handleTabKeydown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (isOpen) {
                closeModal();
            } else {
                openModal();
            }
        }
    }

    tabBill.addEventListener('keydown', handleTabKeydown);
    tabFaq.addEventListener('keydown', handleTabKeydown);

    // Trap focus inside modal when open
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && isOpen) {
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), details summary'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}
