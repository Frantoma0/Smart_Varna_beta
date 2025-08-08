// public/admin/components/signalsTable.js

const tableBody = document.getElementById('signals-table-body');
const tableHead = document.getElementById('table-head'); // Ново: заглавната част на таблицата

let allSignals = [];
let currentSort = { key: 'date', direction: 'desc' };

/**
 * Инициализира таблицата: извлича данните.
 */
export async function initializeTable() {
    try {
        const response = await fetch('/api/admin/signals');
        if (!response.ok) throw new Error('Неуспешно зареждане на сигналите.');
        allSignals = await response.json();
        return allSignals;
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-red-500">${error.message}</td></tr>`;
        return [];
    }
}

/**
 * Връща пълния кеширан списък със сигнали.
 */
export function getAllCachedSignals() {
    return allSignals;
}

/**
 * Закача event listener-и за сортиране.
 * @param {Function} onSortCallback
 */
export function initializeSorting(onSortCallback) {
    // Използваме event delegation върху thead, тъй като съдържанието му се променя
    tableHead.addEventListener('click', (event) => {
        const header = event.target.closest('.sortable-header');
        if (!header) return;

        const sortKey = header.dataset.sortBy;
        if (currentSort.key === sortKey) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.key = sortKey;
            currentSort.direction = 'asc';
        }
        onSortCallback();
    });
}

/**
 * Приема масив от сигнали, сортира ги и ги рендира.
 * @param {object[]} signalsToDisplay
 * @param {'in-progress' | 'resolved' | 'rejected'} activeTab
 */
export function displaySignals(signalsToDisplay, activeTab) {
    tableBody.classList.add('loading');

    const sortedSignals = [...signalsToDisplay].sort((a, b) => {
        // **КОРЕКЦИЯ: Използваме правилните имена на полета от API-то**
        const valA = getSortValue(a, currentSort.key);
        const valB = getSortValue(b, currentSort.key);
        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
    });

    if (currentSort.direction === 'desc') {
        sortedSignals.reverse();
    }
    
    renderTableStructure(activeTab); // Първо рендираме правилните заглавия
    updateSortIcons(); // След това актуализираме иконите
    
    setTimeout(() => {
        renderTableDOM(sortedSignals, activeTab);
        tableBody.classList.remove('loading');
    }, 100);
}

function getSortValue(obj, key) {
    // Използваме правилните имена на полетата, които идват от API-то
    switch (key) {
        case 'date': return new Date(obj.date); // 'date' е правилното име от `getAllMasterSignals`
        case 'weight': return obj.weight || 0;
        case 'title': return (obj.title || '').toLowerCase();
        case 'institution': return (obj.institution || '').toLowerCase();
        default: return obj[key];
    }
}

function updateSortIcons() {
    const tableHeaders = tableHead.querySelectorAll('.sortable-header');
    tableHeaders.forEach(header => {
        const icon = header.querySelector('.sort-icon');
        if (header.dataset.sortBy === currentSort.key) {
            icon.classList.add('active');
            icon.classList.toggle('desc', currentSort.direction !== 'asc');
        } else {
            icon.classList.remove('active', 'desc');
        }
    });
}

/**
 * Генерира правилната структура на заглавния ред (thead) според активния таб.
 */
function renderTableStructure(activeTab) {
    let headersHTML = `
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort-by="date"><span>Дата</span><span class="sort-icon">▼</span></th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort-by="weight"><span>Риск</span><span class="sort-icon">▼</span></th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort-by="title"><span>Заглавие</span><span class="sort-icon">▼</span></th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort-by="institution"><span>Институция</span><span class="sort-icon">▼</span></th>
    `;
    if (activeTab === 'in-progress') {
        headersHTML += `
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Преглед</th>
        `;
    } else {
        headersHTML += `
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
        `;
    }
    tableHead.innerHTML = `<tr>${headersHTML}</tr>`;
}

/**
 * Рендира редовете в DOM.
 */
function renderTableDOM(signals, activeTab) {
    tableBody.innerHTML = '';
    if (signals.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">Няма сигнали в тази секция.</td></tr>`;
        return;
    }

    signals.forEach(signal => {
        const tr = document.createElement('tr');
        const weight = signal.weight ? signal.weight.toFixed(1) : '0.0';
        tr.className = 'hover:bg-gray-50';
        
        let thumbnailHTML;
        if (signal.imageUrl) {
            // Определяме какво действие да извърши снимката според активния таб
            const actionForThumbnail = (activeTab === 'in-progress') ? 'view' : 'reopen';
            const titleForThumbnail = (activeTab === 'in-progress') ? 'Преглед на сигнала' : 'Върни в процес';

            // Използваме променливите, за да генерираме правилния бутон
            thumbnailHTML = `
                <button 
                    data-signal-id="${signal.id}" 
                    data-action="${actionForThumbnail}" 
                    title="${titleForThumbnail}" 
                    class="mr-4 p-0 border-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#09A7E4] rounded-md">
                    <img src="${signal.imageUrl}" alt="Миниатюра" class="w-10 h-10 rounded-md object-cover pointer-events-none">
                </button>
            `;
        } else {
            thumbnailHTML = `<div class="w-10 h-10 rounded-md bg-gray-200 mr-4 flex-shrink-0"></div>`;
        }
        

        let actionButtonsHTML = '';
        if (activeTab === 'in-progress') {
            actionButtonsHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                    <button data-signal-id="${signal.id}" data-action="reject" class="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full hover:bg-red-600">ОТКАЖИ</button>
                    <button data-signal-id="${signal.id}" data-action="resolve" class="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full hover:bg-green-600">РЕШИ</button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-signal-id="${signal.id}" data-action="view" class="text-[#09A7E4] text-center hover:text-indigo-900 font-semibold">Преглед</button>
                </td>`;
        } else {
            actionButtonsHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                     <span class="px-3 py-1 text-white text-xs font-semibold rounded-full shadow-sm ${signal.status.type === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${signal.status.label}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-signal-id="${signal.id}" data-action="reopen" class="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full hover:bg-yellow-600 shadow-sm">ВЪРНИ В ПРОЦЕС</button>
                </td>`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(signal.date).toLocaleString('bg-BG')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">${weight}</td>
            <td class="px-6 py-4">
                <div class="flex items-center">
                    ${thumbnailHTML}
                    <div>
                        <div class="text-sm font-medium text-gray-900">${signal.title || 'Няма заглавие'}</div>
                        <div class="text-sm text-gray-500">${signal.trackCode}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${signal.institution}</td>
            ${actionButtonsHTML}
        `;
        tableBody.appendChild(tr);
    });
}