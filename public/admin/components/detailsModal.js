

// --- Глобални променливи (кеш) ---
let allStatusTypes = [];
let currentSignal = null;
let currentAction = null;
/**
 * Инициализира основните event listener-и за модалния прозорец.
 * Трябва да се извика веднъж при зареждане на dashboard.
 */
let statusIds = {};
let modalOverlay, closeModalBtn, modalContentContainer, modalTitle;
/**
* @param {object} signal - Пълният обект на сигнала.
 * @returns {boolean}
 */
function areAllSubmittersAnonymous(signal) {
    // Проверяваме дали основният подател е анонимен или липсва
    const isMasterAnonymous = !signal.citizen || signal.citizen.email === 'Анонимен' || !signal.citizen.email.includes('@');

    // Проверяваме дали ВСИЧКИ дублиращи сигнали са от анонимни податели
    const areChildrenAnonymous = signal.childSignals.every(child => !child.email || child.email === 'Анонимен' || !child.email.includes('@'));

    return isMasterAnonymous && areChildrenAnonymous;
}

export function initializeModal(statusTypes) {
    allStatusTypes = statusTypes;
    // Кешираме ID-тата за лесен достъп
    modalOverlay = document.getElementById('details-modal-overlay');
    closeModalBtn = document.getElementById('close-modal-btn');
    modalContentContainer = document.getElementById('modal-content-container');
    modalTitle = document.getElementById('modal-title')
    statusIds.resolved = allStatusTypes.find(s => s.type === 'resolved')?.id;
    statusIds.rejected = allStatusTypes.find(s => s.type === 'rejected')?.id;
    statusIds.in_progress = allStatusTypes.find(s => s.type === 'in_progress')?.id;

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

export function openModal() {
    modalOverlay.classList.remove('hidden');
}

export function closeModal() {
    modalOverlay.classList.add('hidden');
    modalContentContainer.innerHTML = `<p class="text-center text-gray-500">Зареждане...</p>`;
}

/**
 * Зарежда и показва пълните детайли за даден сигнал (режим "само за четене").
 * @param {string} signalId
 */
export async function loadDataForView(signalId) {
    openModal();
    modalTitle.textContent = "Детайли за Сигнал";
    try {
        const signalDetails = await fetchSignalById(signalId);
        renderViewModalContent(signalDetails);
    } catch (error) {
        modalContentContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
    }
}

function renderViewModalContent(signal) {
    const formattedDate = new Date(signal.date).toLocaleString('bg-BG');
    const duplicatesHTML = generateDuplicatesHTML(signal); // <-- ИЗПОЛЗВАМЕ НОВАТА ФУНКЦИЯ

    const actionButtonsHTML = `
        <div class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Бързи действия</h3>
            <div class="flex space-x-4">
                <button id="modal-view-reject-btn" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Откажи</button>
                <button id="modal-view-resolve-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Реши</button>
            </div>
        </div>
    `;
    const detailsHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white p-6 rounded-lg border">
                <div class="mb-4">
                    <h1 class="text-2xl font-bold text-gray-900">${signal.title || 'Няма заглавие'}</h1>
                    <p class="text-sm text-gray-500">Код: ${signal.trackCode} | Подаден на: ${formattedDate}</p>
                </div>
                <div class="border-t pt-4">
                    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                        <div class="sm:col-span-2"><dt class="text-sm font-medium text-gray-500">Описание</dt><dd class="mt-1 text-md text-gray-900">${signal.description}</dd></div>
                        <div><dt class="text-sm font-medium text-gray-500">Адрес</dt><dd class="mt-1 text-md text-gray-900">${signal.address}</dd></div>
                        <div><dt class="text-sm font-medium text-gray-500">Институция</dt><dd class="mt-1 text-md text-gray-900">${signal.institution}</dd></div>
                        <div><dt class="text-sm font-medium text-gray-500">Подател</dt><dd class="mt-1 text-md text-gray-900">${signal.citizen.email} (${signal.citizen.total_signals} сигнала)</dd></div>
                    </dl>
                    ${duplicatesHTML}
                </div>
                ${actionButtonsHTML}
                </div>
            <div class="space-y-6">
                ${signal.imageUrl ? `<div class="bg-white p-4 rounded-lg border"><h3 class="text-lg font-medium mb-2">Снимка</h3><img src="${signal.imageUrl}" alt="Снимка към сигнала" class="rounded-md w-full object-cover"></div>` : ''}
                ${signal.latitude && signal.longitude ? `<div class="bg-white p-4 rounded-lg border"><h3 class="text-lg font-medium mb-2">Карта</h3><div id="signal-map" class="h-64 w-full rounded-md z-0"></div></div>` : ''}
            </div>
        </div>`;
    modalContentContainer.innerHTML = detailsHTML;
    initializeMap(signal);
    document.getElementById('modal-view-reject-btn').addEventListener('click', () => {
        loadDataForAction(signal.id, 'reject');
    });
    document.getElementById('modal-view-resolve-btn').addEventListener('click', () => {
        loadDataForAction(signal.id, 'resolve');
    });
}
function generateDuplicatesHTML(signal) {
    if (!signal.childSignals || signal.childSignals.length === 0) {
        return '';
    }

    const duplicatesCount = signal.childSignals.length;
    // Добавяме класове за скрол, само ако сигналите са повече от 3
    const scrollClasses = duplicatesCount > 3 ? 'max-h-48 overflow-y-auto pr-2' : '';

    return `
        <div class="mt-6 border-t pt-4">
            <h3 class="text-lg font-medium">Дублиращи Сигнали (${duplicatesCount})</h3>
            <!-- Нов DIV, който обгръща списъка и позволява скролиране -->
            <div class="${scrollClasses}">
                <ul class="mt-2 divide-y">
                    ${signal.childSignals.map(child => {
                        const childDate = new Date(child.date).toLocaleString('bg-BG');
                        return `<li class="py-2">
                                    <p class="text-sm text-gray-700">${child.description}</p>
                                    <p class="text-xs text-gray-500">
                                        от: ${child.email || 'Анонимен'} | Код: ${child.trackCode} | Подаден на: ${childDate}
                                    </p>
                                </li>`;
                    }).join('')}
                </ul>
            </div>
        </div>`;
}
// --- Секция за "Извършване на действие" ---

/**
 * Зарежда модал за извършване на действие (реши, откажи, върни в процес).
 * @param {string} signalId
 * @param {'resolve' | 'reject' | 'reopen'} action
 */
export async function loadDataForAction(signalId, action) {
    openModal();
    try {
        const signal = await fetchSignalById(signalId);
        renderActionModalContent(signal, action);
    } catch (error) {
        modalContentContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
    }
}

function renderActionModalContent(signal, action) {
    const actionsConfig = {
        resolve: { title: "Разрешаване на Сигнал", btnText: "Изпрати и Реши", simpleBtnText: "Реши сигнала", btnClass: "bg-green-600 hover:bg-green-700", statusId: statusIds.resolved, label: "Решен", template: `Проблемът, описан във Вашия сигнал, беше успешно разрешен. Благодарим Ви за съдействието!` },
        reject: { title: "Отказване на Сигнал", btnText: "Изпрати и Откажи", simpleBtnText: "Откажи сигнала", btnClass: "bg-red-600 hover:bg-red-700", statusId: statusIds.rejected, label: "Отказан", template: `След направена проверка, Вашият сигнал беше отчетен като неоснователен/отхвърлен. Причина: [Моля, добавете причина].` },
        reopen: { title: "Връщане в \"В процес\"", btnText: "Изпрати и Върни", simpleBtnText: "Върни в процес", btnClass: "bg-yellow-500 hover:bg-yellow-600", statusId: statusIds.in_progress, label: "В процес на обработка", template: `Вашият сигнал беше върнат за допълнителна обработка. Причина: [Моля, добавете причина].` }
    };
    const config = actionsConfig[action];
    if (!config) return;

    modalTitle.textContent = config.title;
    const formattedDate = new Date(signal.date).toLocaleString('bg-BG');
    
    const allAnonymous = areAllSubmittersAnonymous(signal);
    let actionFormHTML = '';

    if (allAnonymous) {
        actionFormHTML = `
            <div class="bg-white p-6 rounded-lg border text-center">
                <p class="text-base text-gray-600 mb-4">Всички податели на този сигнал са анонимни. Не е необходимо изпращане на съобщение.</p>
                <button id="direct-status-update" class="w-full ${config.btnClass} text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out">${config.simpleBtnText}</button>
            </div>`;
    } else {
        actionFormHTML = `
            <div class="bg-white p-6 rounded-lg border">
                <label for="email-template" class="block text-base font-medium text-gray-800 mb-2">Съобщение до гражданите</label>
                <textarea id="email-template" rows="8" class="shadow-sm block w-full sm:text-sm border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#09A7E4]">${config.template}</textarea>
                <button id="send-status-update" class="mt-4 w-full ${config.btnClass} text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out">${config.btnText}</button>
            </div>`;
    }

    const submitterInfo = signal.citizen.email === 'Анонимен'
        ? `<span class="text-gray-500 italic">Анонимен подател</span>`
        : `${signal.citizen.email} (${signal.citizen.total_signals} сигнала)`;

    const duplicatesHTML = generateDuplicatesHTML(signal);

    let statusBadgeHTML = '';
    if (action === 'reopen' && signal.status && signal.status.label) {
        const statusClass = signal.status.type === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        statusBadgeHTML = `<span class="px-3 py-1 text-sm font-semibold rounded-full ${statusClass}">${signal.status.label}</span>`;
    }

     const detailsHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white p-6 rounded-lg border">
                    <div class="flex justify-between items-center mb-1">
                        <h3 class="text-2xl font-bold text-gray-900">${signal.title || 'Няма заглавие'}</h3>
                        ${statusBadgeHTML}
                    </div>
                    <p class="text-sm text-gray-500 mt-1">Код: ${signal.trackCode} | Адрес: ${signal.address}</p>
                    <p class="text-xs text-gray-400 mt-1">Подаден на: ${formattedDate}</p>
                    <p class="mt-3 text-gray-800">${signal.description}</p>
                    <p class="mt-4 text-sm"><span class="font-semibold text-gray-600">Подател на първия сигнал:</span> ${submitterInfo}</p>
                </div>
                <!-- Динамичната форма се поставя тук -->
                ${actionFormHTML}
            </div>
            <!-- Дясна колона -->
            <div class="lg:col-span-1 space-y-6">
                ${signal.imageUrl ? `<div class="bg-white p-4 rounded-lg border"><h3 class="text-lg font-medium mb-2">Снимка</h3><img src="${signal.imageUrl}" alt="Снимка към сигнала" class="rounded-md w-full object-cover"></div>` : ''}
                ${signal.latitude && signal.longitude ? `<div class="bg-white p-4 rounded-lg border"><h3 class="text-lg font-medium mb-2">Карта</h3><div id="signal-map" class="h-64 w-full rounded-md z-0"></div></div>` : ''}
            </div>
        </div>`;

    modalContentContainer.innerHTML = detailsHTML;
    initializeMap(signal);
    
    const actionButton = document.getElementById('send-status-update') || document.getElementById('direct-status-update');
    if (actionButton) {
        actionButton.addEventListener('click', () => handleSendUpdate(signal, config));
    }
}
// --- Общи/Помощни функции ---

/**
 * Извлича данните за един сигнал от API.
 * @param {string} signalId
 * @returns {Promise<object>}
 */
async function fetchSignalById(signalId) {
    const response = await fetch(`/api/admin/signals/${signalId}`);
    if (!response.ok) throw new Error((await response.json()).error || 'Грешка при зареждане.');
    return await response.json();
}

/**
 * Инициализира картата в модала (използва се само при "Преглед").
 * @param {object} signal
 */
function initializeMap(signal) {
    if (signal.latitude && signal.longitude) {
        const mapElement = document.getElementById('signal-map');
        if (mapElement) {
            const map = L.map(mapElement).setView([signal.latitude, signal.longitude], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([signal.latitude, signal.longitude]).addTo(map);
        }
    }
}

/**
 * Обработва изпращането на промяна в статуса.
 * @param {object} signal
 * @param {object} config
 */
async function handleSendUpdate(signal, config) {
    const sendBtn = document.getElementById('send-status-update') || document.getElementById('direct-status-update');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Изпращане...';

    // Проверяваме дали полето за съобщение съществува
    const messageTextarea = document.getElementById('email-template');
    const message = messageTextarea ? messageTextarea.value : 'Действието е изпълнено (няма получатели за известяване).';

    const payload = {
        newStatusId: config.statusId,
        newStatusLabel: config.label,
        message: message // Използваме стойността или стандартен текст
    };

    try {
        const response = await fetch(`/api/admin/signals/${signal.id}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Сървърна грешка при обновяване.');
        
        alert('Статусът е променен успешно!');
        closeModal();
        window.dispatchEvent(new CustomEvent('signalsUpdated'));
    } catch (error) {
        alert(error.message);
        sendBtn.disabled = false;
        sendBtn.textContent = config.btnText;
    }
}