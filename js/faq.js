// FAQ tab switching and accordion behavior

export function setupFaq() {
    const tabBill = document.getElementById('tab-bill');
    const tabFaq = document.getElementById('tab-faq');
    const billContent = document.getElementById('bill-content');
    const faqContent = document.getElementById('faq-content');
    const billNote = document.getElementById('bill-note');
    const billActions = document.querySelector('.bill-actions');

    if (!tabBill || !tabFaq || !billContent || !faqContent) {
        return;
    }

    const BILL_NOTE_TEXT = 'Rendered directly from the source file for accuracy.';
    const FAQ_NOTE_TEXT = 'Analysis of potential concerns with Initiative No. 25-0024.';

    function switchTab(tab) {
        const isBillTab = tab === 'bill';

        // Update tab buttons
        tabBill.classList.toggle('active', isBillTab);
        tabFaq.classList.toggle('active', !isBillTab);
        tabBill.setAttribute('aria-selected', isBillTab ? 'true' : 'false');
        tabFaq.setAttribute('aria-selected', !isBillTab ? 'true' : 'false');

        // Update content visibility
        if (isBillTab) {
            billContent.hidden = false;
            faqContent.hidden = true;
        } else {
            billContent.hidden = true;
            faqContent.hidden = false;
        }

        // Update note text
        if (billNote) {
            billNote.textContent = isBillTab ? BILL_NOTE_TEXT : FAQ_NOTE_TEXT;
        }

        // Show/hide bill actions (highlights, clear) - only for bill tab
        if (billActions) {
            billActions.style.display = isBillTab ? '' : 'none';
        }

        // Scroll to top of content area
        if (isBillTab) {
            billContent.scrollTop = 0;
        } else {
            faqContent.scrollTop = 0;
        }
    }

    // Tab click handlers
    tabBill.addEventListener('click', () => switchTab('bill'));
    tabFaq.addEventListener('click', () => switchTab('faq'));

    // Keyboard navigation between tabs
    function handleTabKeydown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const currentTab = e.target.dataset.tab;
            const nextTab = currentTab === 'bill' ? 'faq' : 'bill';
            const nextTabEl = nextTab === 'bill' ? tabBill : tabFaq;
            nextTabEl.focus();
            switchTab(nextTab);
        }
    }

    tabBill.addEventListener('keydown', handleTabKeydown);
    tabFaq.addEventListener('keydown', handleTabKeydown);
}
