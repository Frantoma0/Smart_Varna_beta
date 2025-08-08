document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    let SUPABASE_URL = '';
    let SUPABASE_ANON_KEY = '';
    let supabaseClient = null;
    let dateSliderInstance = null;
    let isSliderInteracted = false;

    async function loadSupabaseKeys() {
        try {
            const response = await fetch('/api/supabase-keys');
            if (!response.ok) throw new Error('Неуспешно зареждане на Supabase ключове');
            const data = await response.json();
            SUPABASE_URL = data.url;
            SUPABASE_ANON_KEY = data.anonKey;
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                alert('Липсват Supabase ключове или URL!');
                return;
            }
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            initializeApp();
        } catch (error) {
            alert('Грешка при зареждане на Supabase ключове: ' + error.message);
            console.error('Грешка при зареждане на Supabase ключове:', error);
        }
    }

    function initializeApp() {
        const signalsContainer = document.getElementById('signals-container');
        const loadingIndicator = document.getElementById('loading-indicator');
        const mapElement = document.getElementById('map');
        const searchInput = document.getElementById('searchInput');
        const filterToggleBtn = document.getElementById('filter-toggle-btn');
        const filterPanel = document.getElementById('filter-panel');
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const confirmationModalOverlay = document.getElementById('confirmation-modal-overlay');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const heatmapToggleBtn = document.getElementById('heatmap-toggle-btn');
        const heatmapToggleIcon = document.getElementById('heatmap-toggle-icon');
        const dateSliderElement = document.getElementById('date-slider');
        const dateInputStart = document.getElementById('date-input-start');
        const dateInputEnd = document.getElementById('date-input-end');

        let allSignals = [];
        let minDateTimestamp = null;
        let maxDateTimestamp = null;
        let currentlyDisplayedSignals = [];
        let activeFilters = { sort: 'newest', statuses: [] };
        let categoryRules = [];
        let cardToRemove = null;
        let markersMap = {};
        let iconMapping = {};
        let currentlySelectedSignalId = null;
        let isHeatmapVisible = false; // === НОВО: Променлива за състоянието на топлинната карта ===
        
        let heatPoints = [];

        const map = L.map(mapElement).setView([43.2141, 27.9147], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const clusterMarkers = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            spiderfyDistanceMultiplier: 1.4,
            iconCreateFunction: function(cluster) {
                const markers = cluster.getAllChildMarkers();
                let maxWeight = 0;
                markers.forEach(marker => {
                    if (marker.options.weight > maxWeight) {
                        maxWeight = marker.options.weight;
                    }
                });

                const severityInfo = getSeverityInfo(maxWeight);
                const clusterClassName = `marker-cluster marker-cluster-${severityInfo.className}`;

                return L.divIcon({
                    html: `<div><span>${cluster.getChildCount()}</span></div>`,
                    className: clusterClassName,
                    iconSize: new L.Point(40, 40)
                });
            }
        });
        map.addLayer(clusterMarkers);
        
        // 5. Инициализираме топлинния слой с правилните настройки за началния мащаб
         const heatLayer = L.heatLayer([], {
            radius: 25,
            blur: 15,
            max: 10.0,
            minOpacity: 0.7,
            gradient: {
                0.1:  '#3C3586', 0.25: '#5790F7', 0.4:  '#7EF394',
                0.6:  '#E8D358', 0.75: '#E97E38', 0.9:  '#C12A1F',
                1.0:  '#791C0D'
            }
        });
        
        // --- НОВО: Функция за определяне на спешност по тежест ---
        function getSeverityInfo(weight) {
            const numericWeight = parseFloat(weight) || 0;
            if (numericWeight >= 70) return { text: 'Критичен', color: '#EF4444', className: 'critical' };
            if (numericWeight >= 30) return { text: 'Висок приоритет', color: '#F59E0B', className: 'high-priority' };
            return { text: 'Рутинен', color: '#3B82F6', className: 'routine' };
        }

        function getStatusInfo(dbStatus) {
            const statusMap = {
                'in_progress': { text: 'В процес на обработка', className: 'in_progress' },
                'resolved': { text: 'Решен', className: 'resolved' },
                'rejected': { text: 'Отказан', className: 'rejected' }
            };
            return statusMap[dbStatus] || { text: 'Неизвестен', className: 'unknown' };
        }
        
        // --- ПРОМЯНА: Логиката за рендиране на маркерите ---
        function renderMapMarkers(signals) {
            clusterMarkers.clearLayers();
            markersMap = {}; // КОРЕКЦИЯ: Изчистваме старите референции към маркери
            const heatPoints = [];
            
            const signalsForMap = signals.filter(s => s.status?.status_types?.type === 'in_progress' || s.status?.status_types?.type === 'received');

            signalsForMap.forEach(signal => {
                if (signal.latitude && signal.longitude) {
                    const severityInfo = getSeverityInfo(signal.weight); // <-- Взимаме цвят по спешност
                    const synthesizedTitle = synthesizeCategory(signal.description, categoryRules);
                    let pulseClass = '';
                    if (severityInfo.className === 'critical') {
                        pulseClass = ' marker-pulse-critical';
                    } else if (severityInfo.className === 'high-priority') {
                        pulseClass = ' marker-pulse-high-priority';
                    }
                    const iconFilename = iconMapping[synthesizedTitle];
                    let markerContent = '';
                    if (iconFilename) {
                        markerContent = `<img src="/icons/${iconFilename}" class="marker-icon-svg" alt="${synthesizedTitle}">`;
                    } else {
                        markerContent = `<span style="color: #ffffff; font-size: 14px; font-weight: 700; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">!</span>`;
                    }
                    
                    const customIcon = L.divIcon({
                        className: `custom-div-icon ${pulseClass}`,
                        html: `<div class="marker-pin" style="background-color: ${severityInfo.color};">${markerContent}</div>`,
                        iconSize: [40, 40], 
                        iconAnchor: [20, 20], 
                        popupAnchor: [0, -20]
                    });

                    const marker = L.marker([signal.latitude, signal.longitude], { icon: customIcon });
                    marker.options.weight = signal.weight;
                    
                    if (signal.tracking_code) {
                        markersMap[signal.tracking_code] = marker;
                    }

                    marker.bindPopup(`
                        <div style="min-width: 220px; max-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
                            <div style="font-weight: 600; font-size: 16px; margin-bottom: 10px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">
                                ${synthesizedTitle} <br>Сигнал #${signal.tracking_code || 'N/A'}
                            </div>
                            <div style="margin-bottom: 12px; color: #374151; font-size: 14px;">
                                ${signal.description || 'Няма описание'}
                            </div>
                            <div style="font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                <span style="color: #6b7280; font-weight: 500;">Спешност:</span>
                                <span style="background-color: ${severityInfo.color}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-shadow: 0 1px 1px rgba(0,0,0,0.2);">${severityInfo.text}</span>
                            </div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">
                                <span style="font-weight: 500;">Адрес:</span> ${signal.adress || 'Няма адрес'}
                            </div>
                        </div>
                    `, { maxWidth: 300, className: 'custom-popup' });
                    clusterMarkers.addLayer(marker);
                }
            });
        }

        // *** ПОДОБРЕНО: По-детайлни статуси ***
        function getStatusInfo(dbStatus) {
            const statusMap = {
                'in_progress': { text: 'В процес на обработка', className: 'in_progress', color: '#F59E0B' },
                'resolved': { text: 'Решен', className: 'resolved', color: '#10B981' },
                'rejected': { text: 'Отказан', className: 'rejected', color: '#EF4444' }
            };
            return statusMap[dbStatus] || { text: 'Неизвестен', className: 'unknown', color: '#9CA3AF' };
        }

        // *** ДОБАВЕНО: Разширена система за категоризация ***
        function synthesizeCategory(description, rules) { 
            if (!description) return 'Общ сигнал';
            const lowerCaseDesc = description.toLowerCase();
            // Вече използваме 'rules', които сме получили от сървъра
            for (const rule of rules) { 
                for (const keyword of rule.keywords) {
                    if (lowerCaseDesc.includes(keyword)) return rule.category;
                }
            }
            return 'Общ сигнал';
        }

        async function loadSignals() {
            if (!supabaseClient) {
                alert('Supabase клиентът не е инициализиран! Провери ключовете.');
                return;
            }
            try {
                // Извличаме само главните сигнали, които вече съдържат всичката нужна информация.
                const [masterSignalsResponse, categoryRulesResponse, iconMappingResponse] = await Promise.all([
                    supabaseClient
                        .from('signal')
                        .select(`
                            signal_id, title, description, adress, date_created, latitude, longitude, 
                            tracking_code, institution, image_url, weight,
                            status:status_id ( status_types:status_type_id ( type, Description ) )
                        `),
                    fetch('/api/get-category-rules'),
                    fetch('/api/get-icon-mapping')
                ]);
        
                const { data: signals, error: signalError } = masterSignalsResponse;
                const fetchedCategoryRules = await categoryRulesResponse.json();
                const fetchedIconMapping = await iconMappingResponse.json(); 
        
                if (signalError) throw signalError;
                if (!categoryRulesResponse.ok) throw new Error('Грешка при зареждане на категориите');
                if (!iconMappingResponse.ok) throw new Error('Грешка при зареждане на иконите');
        
                categoryRules = fetchedCategoryRules;
                iconMapping = fetchedIconMapping;
                allSignals = signals.map(s => ({
                    ...s,
                    // Добавяме дефолтна структура, ако status е null
                    status: s.status || { status_types: { type: 'unknown', Description: 'Неизвестен' } }
                }));
        
                heatPoints = allSignals
                    .filter(signal => signal.latitude && signal.longitude)
                    .map(signal => [signal.latitude, signal.longitude, signal.weight || 10]); // [lat, lng, intensity]
                
                // Актуализираме слоя с новите данни
                heatLayer.setLatLngs(heatPoints);

                loadingIndicator.style.display = 'none';
                initializeDateSlider(allSignals);
                applyFiltersAndRender();
            } catch (error) {
                alert('Грешка при зареждане на сигналите: ' + (error.message || error));
                loadingIndicator.innerHTML = `<p class="text-red-500">Грешка при зареждане: ${error.message}</p>`;
            }
        }

        function initializeDateSlider(signals) {
            if (!signals.length || dateSliderInstance) return;
        
            const dates = signals.map(s => new Date(s.date_created).getTime());
            minDateTimestamp = Math.min(...dates);
            maxDateTimestamp = Math.max(...dates);
        
            // Функция за разпознаване на завършена дата от стринг
            function parseDateString(dateStr) {
                if (!dateStr) return null;
                // Очакваме формат "дд.мм.гггг г."
                const cleanStr = dateStr.replace(' г.', '').trim();
                if (!/^\d{2}\.\d{2}\.\d{4}$/.test(cleanStr)) return null;
        
                const parts = cleanStr.split('.');
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Месеците в JS са 0-11
                const year = parseInt(parts[2], 10);
        
                const date = new Date(year, month, day);
                // Проверка дали датата е валидна (напр. 30.02 не е валидна)
                if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                    return date;
                }
                return null;
            }
        
            dateSliderInstance = noUiSlider.create(dateSliderElement, {
                start: [minDateTimestamp, maxDateTimestamp],
                connect: true,
                range: { 'min': minDateTimestamp, 'max': maxDateTimestamp },
                step: 24 * 60 * 60 * 1000, // стъпка от 1 ден
                format: {
                    to: value => new Date(Number(value)).toLocaleDateString('bg-BG'),
                    from: Number
                }
            });
        
            dateSliderInstance.on('start', () => { isSliderInteracted = true; });
        
            dateSliderInstance.on('update', (values) => {
                if (document.activeElement !== dateInputStart && document.activeElement !== dateInputEnd) {
                    dateInputStart.value = values[0];
                    dateInputEnd.value = values[1];
                }
                applyFiltersAndRender();
            });
        
            function syncInputsToSlider() {
                const startDate = parseDateString(dateInputStart.value);
                const endDate = parseDateString(dateInputEnd.value);
                const currentSliderValues = dateSliderInstance.get(true);
            
                const newStart = startDate ? startDate.getTime() : currentSliderValues[0];
                const newEnd = endDate ? endDate.getTime() : currentSliderValues[1];
            
                isSliderInteracted = true;
                dateSliderInstance.set([newStart, newEnd]);
            }
        
            // Функция за финална валидация и форматиране (при излизане от полето)
            // Функция за финална валидация и форматиране (при излизане от полето)
            const handleDateInputChange = (event) => {
                const input = event.target;
                const value = input.value;
                const digits = value.replace(/\D/g, ''); // Взимаме само цифри
            
                let day, month, year;
                let finalDateStr = value; // По подразбиране връщаме оригиналната стойност
            
                // Опитваме се да парсираме въведеното
                if (digits.length >= 5 && digits.length <= 8) {
                    year = digits.slice(-4);
                    const dayMonthPart = digits.slice(0, -4);
            
                    if (dayMonthPart.length === 4) { // 05082025
                        day = dayMonthPart.slice(0, 2);
                        month = dayMonthPart.slice(2, 4);
                    } else if (dayMonthPart.length === 3) { // 5082025
                        day = dayMonthPart.slice(0, 1);
                        month = dayMonthPart.slice(1, 3);
                    } else if (dayMonthPart.length === 2) { // 582025
                        day = dayMonthPart.slice(0, 1);
                        month = dayMonthPart.slice(1, 2);
                    } else if (dayMonthPart.length === 1) { // 82025
                        day = dayMonthPart.slice(0, 1);
                        month = "1";
                    }
                }
            
                if (day && month && year) {
                    const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    // Проверяваме дали е валидна дата (напр. не е 30.02.2024)
                    const isValidDate = testDate.getFullYear() == year && (testDate.getMonth() + 1) == parseInt(month) && testDate.getDate() == parseInt(day);
            
                    if (isValidDate) {
                        // КЛЮЧОВА ВАЛИДАЦИЯ: Ограничаваме датата в позволения диапазон
                        let dateTimestamp = testDate.getTime();
                        const clampedTimestamp = Math.max(minDateTimestamp, Math.min(dateTimestamp, maxDateTimestamp));
                        
                        const clampedDate = new Date(clampedTimestamp);
            
                        // Форматираме коригираната (clamped) дата за показване
                        const finalDay = String(clampedDate.getDate()).padStart(2, '0');
                        const finalMonth = String(clampedDate.getMonth() + 1).padStart(2, '0');
                        const finalYear = clampedDate.getFullYear();
                        
                        finalDateStr = `${finalDay}.${finalMonth}.${finalYear} г.`;
                    }
                }
                
                // Задаваме финалната, форматирана и валидирана дата в полето
                input.value = finalDateStr;
            
                // Синхронизираме плъзгача с новата (вероятно коригирана) стойност
                syncInputsToSlider();
            };
            // Функция за автоматично добавяне на точки (докато се пише)
            const autoFormatDateOnInput = (event) => {
                const input = event.target;
                let digits = input.value.replace(/\D/g, ''); // Взимаме само цифри
            
                if (digits.length > 8) {
                    digits = digits.slice(0, 8);
                }
            
                if (digits.length > 4) {
                    digits = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
                } else if (digits.length > 2) {
                    digits = `${digits.slice(0, 2)}.${digits.slice(2)}`;
                }
                
                input.value = digits;
            };
        
            dateInputStart.addEventListener('input', autoFormatDateOnInput);
            dateInputEnd.addEventListener('input', autoFormatDateOnInput);
            dateInputStart.addEventListener('change', handleDateInputChange);
            dateInputEnd.addEventListener('change', handleDateInputChange);
        }
        function updateVisibleMapLayer() {
            if (isHeatmapVisible) {
                // --- СЪСТОЯНИЕ: ИСКАМЕ ДА ВИДИМ ТОПЛИННА КАРТА ---
                
                // 1. Скриваме маркерите (но не премахваме слоя им)
                clusterMarkers.clearLayers();

                // 2. Уверяваме се, че топлинният слой е на картата
                if (!map.hasLayer(heatLayer)) {
                    map.addLayer(heatLayer);
                }

                // 3. Актуализираме данните (точките) за топлинния слой
                const heatPoints = currentlyDisplayedSignals
                    .filter(s => s.latitude && s.longitude && (s.status?.status_types?.type === 'in_progress' || s.status?.status_types?.type === 'received'))
                    .map(s => [s.latitude, s.longitude, s.weight || 10]);
                heatLayer.setLatLngs(heatPoints);

            } else {
                // --- СЪСТОЯНИЕ: ИСКАМЕ ДА ВИДИМ МАРКЕРИ ---

                // 1. Скриваме топлинната карта
                if (map.hasLayer(heatLayer)) {
                    map.removeLayer(heatLayer);
                }

                // 2. Актуализираме данните за маркерите
                const activeSignalsForMap = currentlyDisplayedSignals.filter(s => {
                    const status = s.status?.status_types?.type;
                    return status !== 'resolved' && status !== 'rejected';
                });
                
                markersMap = {};
                const newMarkers = activeSignalsForMap
                    .filter(signal => signal.latitude && signal.longitude)
                    .map(signal => createSingleMarker(signal));
                
                clusterMarkers.clearLayers(); // Изчистваме за всеки случай (ако е имало нещо)
                clusterMarkers.addLayers(newMarkers);
            }
        }

        function applyFiltersAndRender() {
            let filteredSignals = [...allSignals];
        
            // --- Филтриране ---
            // 1. По дата от плъзгача
            if (dateSliderInstance) {
                const [startDate, endDate] = dateSliderInstance.get(true);
                filteredSignals = filteredSignals.filter(signal => {
                    const signalDate = new Date(signal.date_created).getTime();
                    return signalDate >= startDate && signalDate <= endDate;
                });
            }
            // 2. По текст от полето за търсене
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                filteredSignals = filteredSignals.filter(signal =>
                    (synthesizeCategory(signal.description, categoryRules).toLowerCase().includes(searchTerm)) ||
                    (signal.tracking_code && signal.tracking_code.toLowerCase().includes(searchTerm)) ||
                    (signal.description && signal.description.toLowerCase().includes(searchTerm))
                );
            }
            // 3. По статус от филтърния панел (ТОВА Е КОРЕКЦИЯТА НА СКРИТИЯ БЪГ)
            if (activeFilters.statuses.length > 0) {
                filteredSignals = filteredSignals.filter(signal => 
                    activeFilters.statuses.includes(signal.status?.status_types?.type)
                );
            }
            currentlyDisplayedSignals = filteredSignals; 
            // --- Рендиране ---
            // Създаваме сортирана версия САМО за списъка с карти
            const sortedSignals = [...filteredSignals];
            if (activeFilters.sort === 'oldest') {
                sortedSignals.sort((a, b) => new Date(a.date_created) - new Date(b.date_created));
            } else { // 'newest' е по подразбиране
                sortedSignals.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
            }
            
            renderSignalCards(sortedSignals);
            updateVisibleMapLayer(); // Картата използва филтрираните, но несортирани сигнали
        }

        function createSingleMarker(signal) {
            const severityInfo = getSeverityInfo(signal.weight);
            const synthesizedTitle = synthesizeCategory(signal.description, categoryRules);
            let pulseClass = '';
            if (severityInfo.className === 'critical') pulseClass = ' marker-pulse-critical';
            else if (severityInfo.className === 'high-priority') pulseClass = ' marker-pulse-high-priority';
            
            const iconFilename = iconMapping[synthesizedTitle];
            const markerContent = iconFilename ? `<img src="/icons/${iconFilename}" class="marker-icon-svg" alt="${synthesizedTitle}">` : `<span class="marker-fallback-icon">!</span>`;
            
            const customIcon = L.divIcon({ className: `custom-div-icon ${pulseClass}`, html: `<div class="marker-pin" style="background-color: ${severityInfo.color};">${markerContent}</div>`, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });

            const marker = L.marker([signal.latitude, signal.longitude], { icon: customIcon });
            marker.options.weight = signal.weight;
            if (signal.tracking_code) markersMap[signal.tracking_code] = marker;

            marker.bindPopup(`<div style="min-width: 220px; max-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;"><div style="font-weight: 600; font-size: 16px; margin-bottom: 10px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">${synthesizedTitle} <br>Сигнал #${signal.tracking_code || 'N/A'}</div><div style="margin-bottom: 12px; color: #374151; font-size: 14px;">${signal.description || 'Няма описание'}</div><div style="font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;"><span style="color: #6b7280; font-weight: 500;">Спешност:</span><span style="background-color: ${severityInfo.color}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${severityInfo.text}</span></div><div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;"><span style="font-weight: 500;">Адрес:</span> ${signal.adress || 'Няма адрес'}</div></div>`, { maxWidth: 300, className: 'custom-popup' });
            
            return marker; // ВРЪЩА МАРКЕРА
        }
        
         function renderSingleMarker(signal) {
            const severityInfo = getSeverityInfo(signal.weight);
            const synthesizedTitle = synthesizeCategory(signal.description, categoryRules);
            let pulseClass = '';
            if (severityInfo.className === 'critical') pulseClass = ' marker-pulse-critical';
            else if (severityInfo.className === 'high-priority') pulseClass = ' marker-pulse-high-priority';
            
            const iconFilename = iconMapping[synthesizedTitle];
            const markerContent = iconFilename 
                ? `<img src="/icons/${iconFilename}" class="marker-icon-svg" alt="${synthesizedTitle}">`
                : `<span class="marker-fallback-icon">!</span>`;
            
            const customIcon = L.divIcon({
                className: `custom-div-icon ${pulseClass}`,
                html: `<div class="marker-pin" style="background-color: ${severityInfo.color};">${markerContent}</div>`,
                iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20]
            });

            const marker = L.marker([signal.latitude, signal.longitude], { icon: customIcon });
            marker.options.weight = signal.weight;
            if (signal.tracking_code) markersMap[signal.tracking_code] = marker;

            marker.bindPopup(`
                <div style="min-width: 220px; max-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 10px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">
                        ${synthesizedTitle} <br>Сигнал #${signal.tracking_code || 'N/A'}
                    </div>
                    <div style="margin-bottom: 12px; color: #374151; font-size: 14px;">
                        ${signal.description || 'Няма описание'}
                    </div>
                    <div style="font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #6b7280; font-weight: 500;">Спешност:</span>
                        <span style="background-color: ${severityInfo.color}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${severityInfo.text}</span>
                    </div>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">
                        <span style="font-weight: 500;">Адрес:</span> ${signal.adress || 'Няма адрес'}
                    </div>
                </div>
            `, { maxWidth: 300, className: 'custom-popup' });
            clusterMarkers.addLayer(marker);
        }

        function renderSignalCards(signals) {
            signalsContainer.innerHTML = '';
            // *** ПОДОБРЕНО: По-информативно съобщение при липса на резултати ***
            if (!signals || signals.length === 0) {
                signalsContainer.innerHTML = `<div class="text-center py-10"><i class="fas fa-inbox text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-xl font-medium">Няма намерени сигнали</p><p class="text-gray-400 mt-2">Опитайте да промените филтрите или критериите за търсене</p></div>`;
                return;
            }
            signals.forEach(signal => {
                const dbStatus = signal.status?.status_types?.type || 'unknown';
                const statusInfo = getStatusInfo(dbStatus);
                const severityInfo = getSeverityInfo(signal.weight);
                
                const dateTime = new Date(signal.date_created);
                const time = dateTime.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
                const date = dateTime.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
                let synthesizedTitle = signal.title;
        
                // Ако заглавието е null или празно
                if (!synthesizedTitle) {
                    // 1. Генерираме го в движение
                    synthesizedTitle = synthesizeCategory(signal.description, categoryRules);
                    
                    // 2. Изпращаме заявка да го запишем в базата "тихо" във фон
                    // Използваме самоизвикваща се асинхронна функция, за да не блокираме рендирането
                    (async () => {
                        try {
                            await fetch('/api/update-title', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    trackCode: signal.tracking_code, 
                                    newTitle: synthesizedTitle 
                                }),
                            });
                            console.log(`Заглавието за ${signal.tracking_code} е обновено успешно.`);
                        } catch (error) {
                            console.error(`Неуспешно обновяване на заглавие за ${signal.tracking_code}:`, error);
                        }
                    })();
                }
                const descriptionText = signal.description || 'Няма описание.';
                const address = signal.adress || 'Няма адрес.';
                const trackingCode = signal.tracking_code || 'Няма код';
                const institution = signal.institution || 'Неопределена';
                const imageUrl = signal.image_url || '';
                
                const signalCard = document.createElement('div');
                signalCard.className = `signal-card border border-gray-200 rounded-xl p-4 shadow-sm bg-white`;
                signalCard.style.borderLeft = `4px solid ${severityInfo.color}`;
                signalCard.setAttribute('data-id', trackingCode);

                // *** ПОДОБРЕНО: Конструкция на URL за миниатюра ***
                const thumbnailUrl = imageUrl 
                    ? `${imageUrl}?transform=w_100,h_100,c_cover` // w=width, h=height, c=cover(crop)
                    : '';
                
                const thumbnailHtml = imageUrl ?
                    `<div class="photo-thumb-container" data-image-url="${imageUrl}">
                        <img src="${thumbnailUrl}" alt="Миниатюра" class="w-12 h-12 object-cover rounded-md border border-gray-200 hover:opacity-80 transition-opacity">
                     </div>` :
                    '';

                    const isActiveOnMap = (dbStatus === 'in_progress' || dbStatus === 'received') && signal.latitude && signal.longitude;
                const locationButtonHtml = isActiveOnMap
                    ? `<button class="p-2 text-gray-500 hover:text-blue-600 signal-location-btn" title="Покажи на картата"><i class="fas fa-map-marker-alt"></i></button>`
                    : `<div class="p-2 w-[36px]"></div>`;

                // *** ПОДОБРЕНО: HTML с бутон за копиране и по-добра структура ***
                signalCard.innerHTML = `
                    <div class="flex justify-between items-start cursor-pointer signal-toggle">
                        <div class="pr-4">
                            <h3 class="text-lg font-bold text-gray-800">${synthesizedTitle}</h3>
                            <div class="flex items-center mt-1 gap-2 flex-wrap">
                                <span class="text-sm text-gray-500">${time} ${date}</span>
                                <span class="signal-status status-${statusInfo.className}">${statusInfo.text}</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 flex-shrink-0">
                        ${locationButtonHtml}                            
                        <button class="p-2 text-gray-500 hover:text-red-600 signal-delete-btn" title="Изтрий сигнал"><i class="fas fa-trash-alt"></i></button>
                            <svg class="w-6 h-6 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                    <div class="signal-details hidden mt-4 pt-4 border-t border-gray-200 relative">
                        ${thumbnailHtml}
                        <p class="text-gray-700 mb-3"><span class="font-semibold">Описание:</span> ${descriptionText}</p>
                        <p class="text-gray-700 mb-3"><span class="font-semibold">Институция:</span> ${institution}</p>
                        <p class="text-gray-700 mb-3"><span class="font-semibold">Адрес:</span> ${address}</p>
                        <div class="flex justify-between items-center mt-4">
                            <p class="text-gray-600"><span class="font-semibold">Код за проследяване:</span> ${trackingCode}</p>
                            <button class="text-blue-600 hover:text-blue-800 font-medium flex items-center copy-code-btn">Копирай <i class="fas fa-copy ml-1"></i></button>
                        </div>
                    </div>
                `;
                signalsContainer.appendChild(signalCard);
            });
        }

        // *** ПОДОБРЕНО: Логика за всички бутони, включително копиране и показване на картата ***
        // *** ПОДОБРЕНО: Логика за всички бутони, включително копиране и показване на картата ***
        signalsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const signalCard = target.closest('.signal-card');
            if (!signalCard) return;

            const signalId = signalCard.getAttribute('data-id');
            const thumbContainer = target.closest('.photo-thumb-container');
            const deleteBtn = target.closest('.signal-delete-btn');
            const locationBtn = target.closest('.signal-location-btn');
            const copyBtn = target.closest('.copy-code-btn');
            const toggleArea = target.closest('.signal-toggle');

            if (e.target.closest('.photo-thumb-container')) {
                e.stopPropagation();
                const modal = document.getElementById('photo-modal');
                const modalImg = document.getElementById('modal-photo-img');
                const url = e.target.closest('.photo-thumb-container').dataset.imageUrl;
                if (modal && modalImg && url) { modalImg.src = url; modal.classList.remove('hidden'); }
            } else if (e.target.closest('.signal-delete-btn')) {
                e.stopPropagation();
                cardToRemove = signalCard;
                confirmationModalOverlay.classList.remove('hidden');
            
            // ▼▼▼ ЗАПОЧВА СЕКЦИЯТА ЗА ЗАМЯНА ▼▼▼
            } else if (e.target.closest('.signal-location-btn')) {
                e.stopPropagation();
                if(isHeatmapVisible) return; // Не прави нищо, ако сме на топлинна карта
                
                const marker = markersMap[signalId];
                if (marker) {
                    // Взимаме координатите на маркера
                    const targetLatLng = marker.getLatLng();
                    // Задаваме висок зуум, за да сме сигурни, че клъстерът ще се разбие
                    const targetZoom = 18; 

                    // Казваме на картата да "прелети" до там с плавна анимация
                    map.flyTo(targetLatLng, targetZoom, {
                        duration: 1.2 // Продължителност на анимацията в секунди
                    });

                    // Изчакваме анимацията по мащабиране да приключи...
                    map.once('zoomend', () => {
                        // ...и чак тогава отваряме Popup-а и пускаме анимацията
                        marker.openPopup();
                        const iconElement = marker._icon;
                        if (iconElement) {
                            iconElement.classList.add('marker-located');
                            setTimeout(() => iconElement.classList.remove('marker-located'), 1000);
                        }
                    });
                }
            // ▲▲▲ КРАЙ НА СЕКЦИЯТА ЗА ЗАМЯНА ▲▲▲

            } else if (e.target.closest('.copy-code-btn')) {
                e.stopPropagation();
                const copyBtn = e.target.closest('.copy-code-btn');
                navigator.clipboard.writeText(signalId).then(() => {
                    copyBtn.innerHTML = 'Копирано! <i class="fas fa-check ml-1"></i>';
                    setTimeout(() => { copyBtn.innerHTML = 'Копирай <i class="fas fa-copy ml-1"></i>'; }, 2000);
                });
            } else if (e.target.closest('.signal-toggle')) {
                signalCard.querySelector('.signal-details')?.classList.toggle('hidden');
                signalCard.querySelector('svg.transition-transform')?.classList.toggle('rotate-180');
            }
        });


        searchInput.addEventListener('input', () => applyFiltersAndRender());
        filterToggleBtn.addEventListener('click', () => {
            filterPanel.classList.toggle('hidden');
            filterToggleBtn.classList.toggle('bg-gray-100');
        });
        applyFiltersBtn.addEventListener('click', () => {
            activeFilters = {
                sort: document.querySelector('input[name="sort"]:checked').value,
                statuses: Array.from(document.querySelectorAll('.filter-status:checked')).map(el => el.value)
            };
            filterPanel.classList.add('hidden');
            filterToggleBtn.classList.remove('bg-gray-100');
            applyFiltersAndRender();
        });
        clearFiltersBtn.addEventListener('click', () => {
            activeFilters = { sort: 'newest', statuses: [] };
            document.querySelector('input[name="sort"][value="newest"]').checked = true;
            document.querySelectorAll('.filter-status:checked').forEach(el => el.checked = false);
            searchInput.value = '';
            if (dateSliderInstance && allSignals.length) {
                const dates = allSignals.map(s => new Date(s.date_created).getTime());
                const minDate = Math.min(...dates);
                const maxDate = Math.max(...dates);
                dateSliderInstance.set([minDate, maxDate]);
                isSliderInteracted = false;
            }
            filterPanel.classList.add('hidden');
            filterToggleBtn.classList.remove('bg-gray-100');
            applyFiltersAndRender();
        });

        function hideModal() {
            confirmationModalOverlay.classList.add('hidden');
            cardToRemove = null;
        }
        cancelDeleteBtn.addEventListener('click', hideModal);
        confirmationModalOverlay.addEventListener('click', (event) => {
            if (event.target === confirmationModalOverlay) hideModal();
        });
        
        // *** ПОДОБРЕНО: Коректна логика за изтриване ***
        confirmDeleteBtn.addEventListener('click', () => {
            if (cardToRemove) {
                const cardId = cardToRemove.getAttribute('data-id');
                // Премахва сигнала от основния масив с данни
                allSignals = allSignals.filter(s => s.tracking_code !== cardId);
                // Презарежда списъка, за да отрази промяната
                applyFiltersAndRender();
            }
            hideModal();
        });

        setupPhotoModalCloseListeners();
        heatmapToggleBtn.addEventListener('click', () => {
            // 1. Просто превключваме флага за състоянието
            isHeatmapVisible = !isHeatmapVisible;
            heatmapToggleBtn.classList.toggle('active', isHeatmapVisible);

            // 2. Обновяваме иконата и текста на бутона
            if (isHeatmapVisible) {
                heatmapToggleIcon.src = '/images/map.png';
                heatmapToggleBtn.title = 'Превключи към маркери';
            } else {
                heatmapToggleIcon.src = '/images/fire.png';
                heatmapToggleBtn.title = 'Превключи към топлинна карта';
            }
            
            // 3. Извикваме една функция, която да свърши цялата работа по актуализация на картата
            updateVisibleMapLayer();
        });

        loadSignals();
    }

    function getSeverityInfo(weight) {
        const numericWeight = parseFloat(weight) || 0;
        if (numericWeight >= 70) return { text: 'Критичен', color: '#EF4444', className: 'critical' };
        if (numericWeight >= 30) return { text: 'Висок приоритет', color: '#F59E0B', className: 'high-priority' };
        return { text: 'Рутинен', color: '#3B82F6', className: 'routine' };
    }

    // *** ПОДОБРЕНО: Функция за затваряне на модалния прозорец за снимка ***
    function setupPhotoModalCloseListeners() {
        const closeModalBtn = document.getElementById('close-photo-modal');
        const photoModal = document.getElementById('photo-modal');
        const modalImg = document.getElementById('modal-photo-img');
        if (closeModalBtn && photoModal && modalImg) {
            const close = () => {
                photoModal.classList.add('hidden');
                modalImg.src = ''; // Изчиства снимката, за да не се показва стара при следващо отваряне
            };
            closeModalBtn.addEventListener('click', close);
            photoModal.addEventListener('click', (e) => {
                if (e.target === photoModal) {
                    close();
                }
            });
        }
    }

   
    loadSupabaseKeys();
});
