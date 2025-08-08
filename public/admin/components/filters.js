// public/admin/components/filters.js

const searchInput = document.getElementById('search-input');
const filterBtn = document.getElementById('filter-btn');
const filterPanel = document.getElementById('filter-panel');
const statusCheckboxes = document.querySelectorAll('.filter-status-checkbox');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

let debounceTimer;

/**
 * Инициализира всички event listener-и за филтрите и търсенето.
 */
export function initializeFilters() {
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(dispatchFilterChangeEvent, 300);
    });

    filterBtn.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
    });

    applyFiltersBtn.addEventListener('click', () => {
        dispatchFilterChangeEvent();
        filterPanel.classList.add('hidden');
    });

    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        statusCheckboxes.forEach(cb => cb.checked = false);
        dispatchFilterChangeEvent();
        filterPanel.classList.add('hidden');
    });

    // Затваряне на панела при клик извън него
    document.addEventListener('click', (e) => {
        if (!filterBtn.contains(e.target) && !filterPanel.contains(e.target)) {
            filterPanel.classList.add('hidden');
        }
    });
}

/**
 * Събира текущите стойности от филтрите и изпраща персонализирано събитие.
 */
function dispatchFilterChangeEvent() {
    const selectedStatuses = Array.from(statusCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const filterCriteria = {
        searchTerm: searchInput.value.toLowerCase().trim(),
        statuses: selectedStatuses
    };

    const event = new CustomEvent('filtersChanged', { detail: filterCriteria });
    window.dispatchEvent(event);
}