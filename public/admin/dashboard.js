// public/admin/dashboard.js
import { initializeTable, initializeSorting, displaySignals, getAllCachedSignals } from './components/signalsTable.js';
import { initializeModal, loadDataForView, loadDataForAction } from './components/detailsModal.js';

document.addEventListener('DOMContentLoaded', async () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const searchInput = document.getElementById('search-input');
    
    let allSignals = [];
    let activeTab = 'in-progress';
    let searchTerm = '';
    let debounceTimer;

    try {
        const statusesResponse = await fetch('/api/status-types');
        if (!statusesResponse.ok) throw new Error('Неуспешно зареждане на статусите.');
        const allStatusTypes = await statusesResponse.json();

        initializeModal(allStatusTypes);
        allSignals = await initializeTable();
        
        const updateView = () => {
            const filteredSignals = searchTerm
                ? allSignals.filter(s =>
                    (s.title && s.title.toLowerCase().includes(searchTerm)) ||
                    (s.description && s.description.toLowerCase().includes(searchTerm)) ||
                    (s.trackCode && s.trackCode.toLowerCase().includes(searchTerm)) ||
                    (s.childTrackCodes && s.childTrackCodes.some(code => code.toLowerCase().includes(searchTerm)))
                )
                : allSignals;

            const resultsByTab = {
                'in-progress': filteredSignals.filter(s => s.status.type === 'in_progress' || s.status.type === 'received'),
                'resolved': filteredSignals.filter(s => s.status.type === 'resolved'),
                'rejected': filteredSignals.filter(s => s.status.type === 'rejected')
            };

            const nonEmptyTabs = Object.keys(resultsByTab).filter(tab => resultsByTab[tab].length > 0);
            if (searchTerm && nonEmptyTabs.length === 1 && activeTab !== nonEmptyTabs[0]) {
                activeTab = nonEmptyTabs[0];
            }
            
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
            displaySignals(resultsByTab[activeTab], activeTab);
        };
        
        initializeSorting(updateView);
        
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchTerm = searchInput.value.toLowerCase().trim();
                updateView();
            }, 300);
        });
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // НОВО: Изчистваме полето и състоянието за търсене
                searchInput.value = '';
                searchTerm = '';
        
                // Старата логика си остава
                activeTab = tab.dataset.tab;
                updateView();
            });
        });

        document.querySelector('main').addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const signalId = button.dataset.signalId;
            const action = button.dataset.action;
            if (action === 'view') loadDataForView(signalId);
            else loadDataForAction(signalId, action);
        });

        window.addEventListener('signalsUpdated', async () => {
            console.log("Данните се презареждат...");
            allSignals = await initializeTable();
            updateView();
        });
        
        updateView();

    } catch (error) {
        console.error("Критична грешка при инициализация:", error);
        document.body.innerHTML = `<p class="text-red-500 p-8 text-center">${error.message}</p>`;
    }
});