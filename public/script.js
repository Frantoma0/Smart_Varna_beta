// Премахвам хардкоднатите ключове
// SUPABASE_URL и SUPABASE_ANON_KEY ще се зареждат динамично
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';
let OPENAI_SYSTEM_PROMPT = '';
let OPENAI_INSTITUTION_PROMPT = '';
let NEARBY_SIGNALS_RADIUS = 30;
window.supabaseClient = null;

// Глобален Promise, който се resolve-ва след инициализация
let supabaseReadyResolve;
const supabaseReady = new Promise((resolve) => { supabaseReadyResolve = resolve; });

async function loadSupabaseKeys() {
    try {
        const response = await fetch('/api/supabase-keys');
        if (!response.ok) throw new Error('Неуспешно зареждане на Supabase ключове');
        const data = await response.json();
        SUPABASE_URL = data.url;
        SUPABASE_ANON_KEY = data.anonKey;
        NEARBY_SIGNALS_RADIUS = data.nearbySignalsRadius;
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            alert('Липсват Supabase ключове или URL!');
            return;
        }
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseReadyResolve();
        await loadPrompts();

        supabaseReadyResolve();
    } catch (error) {
        alert('Грешка при зареждане на Supabase ключове: ' + error.message);
        console.error('Грешка при зареждане на Supabase ключове:', error);
    }
}

async function loadPrompts() {
    try {
        const response = await fetch('/api/get-prompts');
        if (!response.ok) throw new Error('Неуспешно зареждане на промптове');
        const prompts = await response.json();
        OPENAI_SYSTEM_PROMPT = prompts.vision;
        // Тук продължаваме да добавяме JSON-а към края на промпта за институции
        OPENAI_INSTITUTION_PROMPT = prompts.institution + dataCategoriesJSON;
        console.log("Промптовете за фронтенда са заредени успешно!");
    } catch (error) {
        alert('Критична грешка: ' + error.message);
        console.error('Грешка при зареждане на промптове:', error);
    }
}
// Пример за използване на supabaseClient с проверка
function getSupabaseClientOrAlert() {
    if (!window.supabaseClient) {
        alert('Supabase клиентът не е инициализиран! Провери ключовете.');
        throw new Error('Supabase клиентът не е инициализиран!');
    }
    return window.supabaseClient;
}

// Зареждаме ключовете при стартиране
loadSupabaseKeys();

// Промптове и конфигурации
const dataCategoriesJSON = `{"Данъци и такси": { "institution": "Община Варна" }, "Управление на общинска собственост": { "institution": "Община Варна" }, "Зониране и развитие": { "institution": "Община Варна" }, "Градско планиране": { "institution": "Община Варна" }, "Поддръжка на паркове": { "institution": "Община Варна" }, "Улични пейки и обзавеждане": { "institution": "Община Варна" }, "Проблеми с чистотата": { "institution": "Община Варна" }, "Нарушения при паркиране": { "institution": "Община Варна" }, "Дървета и растителност": { "institution": "Община Варна" }, "Местни данъци": { "institution": "Район Одесос" }, "Районни пътища": { "institution": "Район Одесос" }, "Поддръжка на тротоари": { "institution": "Район Одесос" }, "Улични знаци и маркировки": { "institution": "Район Одесос" }, "Комунални услуги в квартала": { "institution": "Район Одесос" }, "Местни данъци (Приморски)": { "institution": "Район Приморски" }, "Районни пътища (Приморски)": { "institution": "Район Приморски" }, "Поддръжка на тротоари (Приморски)": { "institution": "Район Приморски" }, "Улични знаци и маркировки (Приморски)": { "institution": "Район Приморски" }, "Комунални услуги в квартала (Приморски)": { "institution": "Район Приморски" }, "Местни данъци (Младост)": { "institution": "Район Младост" }, "Районни пътища (Младост)": { "institution": "Район Младост" }, "Поддръжка на тротоари (Младост)": { "institution": "Район Младост" }, "Улични знаци и маркировки (Младост)": { "institution": "Район Младост" }, "Комунални услуги в квартала (Младост)": { "institution": "Район Младост" }, "Местни данъци (Аспарухово)": { "institution": "Район Аспарухово" }, "Районни пътища (Аспарухово)": { "institution": "Район Аспарухово" }, "Поддръжка на тротоари (Аспарухово)": { "institution": "Район Аспарухово" }, "Улични знаци и маркировки (Аспарухово)": { "institution": "Район Аспарухово" }, "Комунални услуги в квартала (Аспарухово)": { "institution": "Район Аспарухово" }, "Местни данъци (Владислав Варненчик)": { "institution": "Район Владислав Варненчик" }, "Районни пътища (Владислав Варненчик)": { "institution": "Район Владислав Варненчик" }, "Поддръжка на тротоари (Владислав Варненчик)": { "institution": "Район Владислав Варненчик" }, "Улични знаци и маркировки (Владислав Варненчик)": { "institution": "Район Владислав Варненчик" }, "Комунални услуги в квартала (Владислав Варненчик)": { "institution": "Район Владислав Варненчик" }, "Нарушения при паркиране (МВР)": { "institution": "Областна дирекция на МВР - Варна" }, "Опасностно шофиране": { "institution": "Областна дирекция на МВР - Варна" }, "Превишена скорост": { "institution": "Областна дирекция на МВР - Варна" }, "Пътни произшествия": { "institution": "Областна дирекция на МВР - Варна" }, "Шумни превозни средства": { "institution": "Областна дирекция на МВР - Варна" }, "Нелегални събирания": { "institution": "Областна дирекция на МВР - Варна" }, "Графити и вандализъм": { "institution": "Областна дирекция на МВР - Варна" }, "Обществен ред": { "institution": "Областна дирекция на МВР - Варна" }, "Престъпления": { "institution": "Районна прокуратура - Варна" }, "Корупция": { "institution": "Районна прокуратура - Варна" }, "Имотни престъпления": { "institution": "Районна прокуратура - Варна" }, "Нарушения на закона": { "institution": "Районна прокуратура - Варна" }, "Граждански спорове": { "institution": "Окръжен съд - Варна" }, "Търговски дела": { "institution": "Окръжен съд - Варна" }, "Административни спорове": { "institution": "Окръжен съд - Варна" }, "Наказателни дела": { "institution": "Районен съд - Варна" }, "Семейни спорове": { "institution": "Районен съд - Варна" }, "Малки търговски спорове": { "institution": "Районен съд - Варна" }, "Данъчни въпроси": { "institution": "ТД на НАП Варна" }, "Такси и мита": { "institution": "ТД на НАП Варна" }, "Финансови нарушения": { "institution": "ТД на НАП Варна" }, "Пенсионни въпроси": { "institution": "НОИ - Варна" }, "Осигуровки": { "institution": "НОИ - Варна" }, "Инвалидност": { "institution": "НОИ - Варна" }, "Потребителски права": { "institution": "КЗП - Варна" }, "Нечестни търговски практики": { "institution": "КЗП - Варна" }, "Качество на стоки и услуги": { "institution": "КЗП - Варна" }, "Трудови спорове": { "institution": "Инспекция по труда" }, "Нередовни заплати": { "institution": "Инспекция по труда" }, "Условия на труд": { "institution": "Инспекция по труда" }, "Здравни стандарти": { "institution": "РЗИ - Варна" }, "Хигиена": { "institution": "РЗИ - Варна" }, "Епидемиологичен контрол": { "institution": "РЗИ - Варна" }, "Безопасност на храните": { "institution": "РЗИ - Варна" }, "Замърсяване на въздуха": { "institution": "РИОСВ - Варна" }, "Незаконно изхвърляне на отпадъци": { "institution": "РИОСВ - Варна" }, "Замърсяване на водите": { "institution": "РИОСВ - Варна" }, "Шумово замърсяване": { "institution": "РИОСВ - Варна" }, "Водоснабдяване": { "institution": "ВиК Варна ООД" }, "Канализационни проблеми": { "institution": "ВиК Варна ООД" }, "Течове от тръби": { "institution": "ВиК Варна ООД" }, "Запушване на канали": { "institution": "ВиК Варна ООД" }, "Обществен транспорт": { "institution": "Градски транспорт ЕАД" }, "Автобусни спирки": { "institution": "Градски транспорт ЕАД" }, "Разписания": { "institution": "Градски транспорт ЕАД" }, "Качество на услугите": { "institution": "Градски транспорт ЕАД" }, "Светофари": { "institution": "ОП ТАСРУД" }, "Пътна маркировка": { "institution": "ОП ТАСРУД" }, "Улични знаци": { "institution": "ОП ТАСРУД" }, "Регулиране на трафика": { "institution": "ОП ТАСРУД" }, "Природни бедствия": { "institution": "Гражданска защита - Областно управление" }, "Аварийни ситуации": { "institution": "Гражданска защита - Областно управление" }, "Евакуации": { "institution": "Гражданска защита - Областно управление" }, "Пожари (Първа РСПБЗН)": { "institution": "Първа РСПБЗН – Варна" }, "Аварийни сигнали (Първа РСПБЗН)": { "institution": "Първа РСПБЗН – Варна" }, "Пожарна безопасност (Първа РСПБЗН)": { "institution": "Първа РСПБЗН – Варна" }, "Пожари (Втора РСПБЗН)": { "institution": "Втора РСПБЗН – Варна" }, "Аварийни сигнали (Втора РСПБЗН)": { "institution": "Втора РСПБЗН – Варна" }, "Пожарна безопасност (Втора РСПБЗН)": { "institution": "Втора РСПБЗН – Варна" }, "Дупки по пътя": { "institution": "Агенция Пътна инфраструктура" }, "Повредени пътни настилки": { "institution": "Агенция Пътна инфраструктура" }, "Качество на пътищата": { "institution": "Агенция Пътна инфраструктура" }, "Пътна безопасност": { "institution": "Агенция Пътна инфраструктура" } }`;

document.addEventListener('DOMContentLoaded', function () {
    // Hamburger Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    hamburger.addEventListener('click', function () {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Initialize variables
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const dropzone = document.getElementById('dropzone');
    const photoInput = document.getElementById('photo');
    const preview = document.getElementById('preview');
    const signalForm = document.getElementById('signalForm');
    const successModalOverlay = document.getElementById('successModalOverlay');
    const closeModalButton = document.getElementById('closeModalButton');
    const tokenDisplay = document.getElementById('token');
    const noPhotoButton = document.getElementById('noPhotoButton');
    const suggestedDescriptionField = document.getElementById('suggestedDescription');
    const finalAddressField = document.getElementById('finalAddress');
    const detectLocationBtn = document.getElementById('detectLocationBtn');
    const scanAnimation = document.getElementById('scanAnimation');
    const institutionField = document.getElementById('institution');
    const uploadIcon = document.getElementById('uploadIcon');
    const uploadText = document.getElementById('uploadText');
    const institutionSelect = document.getElementById('institutionSelect');
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const stepIndicator1 = document.getElementById('stepIndicator1');
    const stepIndicator2 = document.getElementById('stepIndicator2');
    const addressSuggestionsContainer = document.getElementById('addressSuggestions');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    let mapModalInstance = null; // За картата в модала за успех
    const institutionsList = [
        "Община Варна", "Район Одесос", "Район Приморски", "Район Младост", "Район Аспарухово",
        "Район Владислав Варненчик", "Областна дирекция на МВР - Варна", "Районна прокуратура - Варна",
        "Окръжен съд - Варна", "Районен съд - Варна", "ТД на НАП Варна", "НОИ - Варна", "КЗП - Варна",
        "Инспекция по труда", "РЗИ - Варна", "РИОСВ - Варна", "ВиК Варна ООД", "Градски транспорт ЕАД",
        "ОП ТАСРУД", "Гражданска защита - Областно управление", "Първа РСПБЗН – Варна", "Втора РСПБЗН – Варна",
        "Агенция Пътна инфраструктура"
    ];

    let temporaryMarker = null;
    let processedFileForUpload = null;
    let debounceTimer; 
    let inlineMapInstance = null;

    finalAddressField.addEventListener('input', (e) => {
        const query = e.target.value;
        // Изчистваме предходния таймер, за да не пращаме заявка при всяко натискане на клавиш
        clearTimeout(debounceTimer);
    
        if (query.length < 3) {
            addressSuggestionsContainer.classList.add('hidden');
            return;
        }
    
        // Задаваме нов таймер. Заявката ще се изпълни след 300ms, ако потребителят спре да пише.
        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/autocomplete-address?query=${encodeURIComponent(query)}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const suggestions = await response.json();
                displayAddressSuggestions(suggestions);
            } catch (error) {
                console.error('Error fetching address suggestions:', error);
                addressSuggestionsContainer.classList.add('hidden');
            }
        }, 300); 
    });
    
    function displayAddressSuggestions(suggestions) {
        addressSuggestionsContainer.innerHTML = '';
        if (!suggestions || suggestions.length === 0) {
            addressSuggestionsContainer.classList.add('hidden');
            return;
        }
    
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.classList.add('address-suggestion-item');
            item.textContent = suggestion.display_name;
            item.addEventListener('click', () => {
                finalAddressField.value = suggestion.display_name;
                latInput.value = suggestion.lat;
                lngInput.value = suggestion.lon; // LocationIQ използва 'lon'
                addressSuggestionsContainer.classList.add('hidden');
                // След избор, можем да проверим и за сигнали наблизо
                findAndDisplayNearbySignals(suggestion.lat, suggestion.lon);
            });
            addressSuggestionsContainer.appendChild(item);
        });
    
        addressSuggestionsContainer.classList.remove('hidden');
    }
    
    // Скриване на предложенията при клик извън полето и контейнера
    document.addEventListener('click', (e) => {
        if (!finalAddressField.contains(e.target) && !addressSuggestionsContainer.contains(e.target)) {
            addressSuggestionsContainer.classList.add('hidden');
        }
    });

    function displayCustomAlert(message) {
        alert(message);
    }

    function showStep(stepNumber) {
    if (stepNumber === 1) {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        backToStep1Btn.style.visibility = 'hidden'; // Използваме visibility
        titleSpacer.style.visibility = 'hidden';   // Използваме visibility
        stepIndicator1.classList.add('active');
        stepIndicator2.classList.remove('active');
    } else if (stepNumber === 2) {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        backToStep1Btn.style.visibility = 'visible'; // Използваме visibility
        titleSpacer.style.visibility = 'visible';  // Използваме visibility
        stepIndicator1.classList.remove('active');
        stepIndicator2.classList.add('active');
    }
    }

    function panToLocationAndProceed(lat, lng, address, description, institution) {
        const dropzone = document.getElementById('dropzone');
        const noPhotoButton = document.getElementById('noPhotoButton');
        const inlineMapContainer = document.getElementById('inlineMapContainer');

        dropzone.classList.add('hidden');
        noPhotoButton.classList.add('hidden');
        inlineMapContainer.classList.remove('hidden');

        if (inlineMapInstance) {
            inlineMapInstance.remove();
        }
        inlineMapInstance = L.map('inlineMapContainer').setView([43.2141, 27.9147], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(inlineMapInstance);

        inlineMapInstance.flyTo([lat, lng], 17, {
            animate: true,
            duration: 2.5
        });

        if (temporaryMarker) {
            inlineMapInstance.removeLayer(temporaryMarker);
        }
        temporaryMarker = L.marker([lat, lng]).addTo(inlineMapInstance)
            .bindPopup(`${address.split('(от')[0].trim()}`)
            .openPopup();
        
        setTimeout(() => {
            showStep(2);

            document.getElementById('lat').value = lat;
            document.getElementById('lng').value = lng;
            suggestedDescriptionField.value = description;
            finalAddressField.value = address;
            
            const matchedInstitution = findClosestInstitutionOption(institution);
            institutionField.value = matchedInstitution;
            institutionSelect.value = matchedInstitution;

            inlineMapContainer.classList.add('hidden');
            dropzone.classList.remove('hidden');
            noPhotoButton.classList.remove('hidden');
            if (inlineMapInstance) {
                inlineMapInstance.remove();
                inlineMapInstance = null;
            }
            if (temporaryMarker) {
                temporaryMarker = null;
            }

        }, 5000);
    }

    async function populateInstitutions() {
        try {
            const response = await fetch('/api/get-institutions');
            if (!response.ok) throw new Error('Грешка при зареждане на институциите');
            const institutionsList = await response.json();
            
            institutionSelect.innerHTML = '';
            institutionsList.forEach(inst => {
                const option = document.createElement('option');
                option.value = inst;
                option.textContent = inst;
                institutionSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            // Може да добавите и съобщение за грешка в UI
        }
    }
    
    function resetPhotoUploadArea() {
        preview.classList.add('hidden');
        preview.src = '';
        uploadIcon.classList.remove('hidden');
        uploadText.textContent = 'Избери или провлачи снимка';
        uploadText.classList.remove('hidden');
        scanAnimation.classList.add('hidden');
        photoInput.value = '';
        processedFileForUpload = null;
    }

    // *** ОБНОВЕНА ФУНКЦИЯ ***
    async function handlePreview() {
        const originalFile = photoInput.files[0];
        if (!originalFile) {
            resetPhotoUploadArea();
            return;
        }

        const fileName = originalFile.name.toLowerCase();
        const isHeic = (originalFile.type === 'image/heic') || (originalFile.type === 'image/heif') || fileName.endsWith('.heic') || fileName.endsWith('.heif');

        if (!originalFile.type.startsWith('image/') && !isHeic) {
            displayCustomAlert('Моля, изберете валиден файлов тип за снимка (JPG, PNG, HEIC и др.).');
            resetPhotoUploadArea();
            return;
        }

        const MAX_FILE_SIZE = 25 * 1024 * 1024;
        if (originalFile.size > MAX_FILE_SIZE) {
            displayCustomAlert('Размерът на снимката е твърде голям (макс. 25MB).');
            resetPhotoUploadArea();
            return;
        }

        // Подготвяме UI за обработка
        uploadIcon.classList.add('hidden');
        uploadText.classList.add('hidden');
        scanAnimation.classList.remove('hidden');
        
        let processedFile = originalFile;

        // --- Блок за конвертиране на HEIC ---
        if (isHeic) {
            const conversionText = document.createElement('div');
            conversionText.textContent = 'Конвертиране на HEIC...';
            conversionText.style.position = 'absolute';
            conversionText.style.bottom = '10px';
            conversionText.style.color = 'white';
            conversionText.style.backgroundColor = 'rgba(0,0,0,0.5)';
            conversionText.style.padding = '2px 8px';
            conversionText.style.borderRadius = '5px';
            conversionText.style.fontSize = '12px';
            conversionText.style.zIndex = '10';
            dropzone.appendChild(conversionText);

            try {
                const conversionResult = await heic2any({
                    blob: originalFile,
                    toType: "image/jpeg",
                    quality: 0.9,
                });
                const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
                processedFile = new File([convertedBlob], "converted_image.jpeg", { type: "image/jpeg" });
            } catch (error) {
                console.error('HEIC conversion error:', error);
                let alertMessage = 'Грешка при конвертирането на HEIC файла. Моля, опитайте с друг формат (JPG/PNG).';
                if (error && error.message && error.message.includes('format not supported')) {
                    alertMessage = "Този HEIC файл е в по-сложен формат (например 'Live Photo'), който не може да бъде обработен в браузъра.\n\n" +
                        "Моля, опитайте едно от следните:\n" +
                        "1. Направете екранна снимка (screenshot) на изображението и качете нея.\n" +
                        "2. Редактирайте леко снимката на телефона си и я запазете като нов файл (това често я конвертира в стандартен JPG).";
                }
                displayCustomAlert(alertMessage);
                resetPhotoUploadArea();
                return;
            } finally {
                if (conversionText) dropzone.removeChild(conversionText);
            }
        }

        // --- Показваме превю и продължаваме с обработката ---
        processedFileForUpload = processedFile;
        preview.src = URL.createObjectURL(processedFile);
        preview.classList.remove('hidden'); // Показваме снимката веднага

        // Анимацията с лупата вече е видима отгоре. Продължаваме с анализа.
        EXIF.getData(originalFile, async function () {
            try {
                const latDMS = EXIF.getTag(this, "GPSLatitude");
                const lngDMS = EXIF.getTag(this, "GPSLongitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

                let locationFoundViaExif = false;
                if (latDMS && lngDMS && latRef && lngRef) {
                    const lat = convertDMSToDD(latDMS, latRef);
                    const lng = convertDMSToDD(lngDMS, lngRef);
                    
                    // КЛЮЧОВАТА ПРОМЯНА Е ТУК:
                    if (lat !== null && lng !== null) {
                        locationFoundViaExif = true;
                        
                        const compressedBase64Image = await compressImage(processedFile);
                        const description = await analyzeImageWithOpenAI(compressedBase64Image);
                        const institution = (description && !description.startsWith('Грешка') && !description.startsWith('Неясна снимка') && !description.startsWith('Не е установена'))
                            ? await getInstitutionFromDescription(description)
                            : "Община Варна";
                        const address = await getAddressFromOpenCage(lat, lng, "снимка", false);

                        scanAnimation.classList.add('hidden');
                        
                        // Сега тази функция се извиква САМО с валидни координати
                        panToLocationAndProceed(lat, lng, address, description, institution);
                    }
                }

                if (!locationFoundViaExif) {
                    const compressedBase64Image = await compressImage(processedFile);
                    const description = await analyzeImageWithOpenAI(compressedBase64Image);
                    suggestedDescriptionField.value = description;

                    let institution = "Община Варна";
                    if (description && !description.startsWith('Грешка') && !description.startsWith('Неясна снимка') && !description.startsWith('Не е установена')) {
                        institution = await getInstitutionFromDescription(description);
                    }
                    const matchedInstitution = findClosestInstitutionOption(institution);
                    institutionField.value = matchedInstitution;
                    institutionSelect.value = matchedInstitution;

                    document.querySelector('#step2 label[for="suggestedDescription"]').textContent = "Предложено описание";
                    showStep(2);
                    scanAnimation.classList.add('hidden');
                    finalAddressField.placeholder = "Адресът не е в снимката, засечете с GPS";
                    detectLocationBtn.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error during image processing:', error);
                displayCustomAlert('Възникна грешка при обработката на снимката.');
                resetPhotoUploadArea();
            }
        });
    }

    // No photo button click handler
    noPhotoButton.addEventListener('click', () => {
        resetPhotoUploadArea();
        suggestedDescriptionField.value = '';
        suggestedDescriptionField.placeholder = "Кратко описание на проблема";
        document.querySelector('#step2 label[for="suggestedDescription"]').textContent = "Описание на проблема";
        finalAddressField.value = '';
        finalAddressField.placeholder = "Натиснете бутона, за да засечете локация";
        institutionField.value = '';
        detectLocationBtn.classList.remove('hidden');
        showStep(2);
    });

    backToStep1Btn.addEventListener('click', () => {
        showStep(1);
        resetPhotoUploadArea();
        signalForm.reset();
        suggestedDescriptionField.placeholder = "Кратко описание на проблема";
        document.querySelector('#step2 label[for="suggestedDescription"]').textContent = "Описание на проблема";
        finalAddressField.placeholder = "Адрес на сигнала";
    });

    // Detect location button click handler
    detectLocationBtn.addEventListener('click', () => {
        const submitButton = signalForm.querySelector('button[type="submit"]');
        if (navigator.geolocation) {
            detectLocationBtn.disabled = true;
            detectLocationBtn.textContent = 'Засичане...';
            if (submitButton) submitButton.disabled = true;

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    document.getElementById('lat').value = lat;
                    document.getElementById('lng').value = lng;
                    await getAddressFromOpenCage(lat, lng, "GPS");

                    await findAndDisplayNearbySignals(lat, lng);

                    detectLocationBtn.disabled = false;
                    detectLocationBtn.textContent = 'Засечи сегашното';
                    if (submitButton) submitButton.disabled = false;
                },
                (error) => {
                    displayCustomAlert('Неуспешно засичане на локация.');
                    console.error('Geolocation Error:', error);

                    detectLocationBtn.disabled = false;
                    detectLocationBtn.textContent = 'Засечи сегашното';
                    if (submitButton) submitButton.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            displayCustomAlert('Геолокацията не се поддържа от този браузър.');
        }
    });

    // Event listeners for file handling
    dropzone.addEventListener('click', () => photoInput.click());
    dropzone.addEventListener('dragenter', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); if (e.dataTransfer.files.length) { photoInput.files = e.dataTransfer.files; handlePreview(); } });
    photoInput.addEventListener('change', handlePreview);

    // Form submission handler
    async function handleFormSubmit(e) {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
    
        // --- Стъпка 1: Валидация на данните от формата ---
        const defaultErrorTexts = ["Не е установена нередност, моля опишете проблема", "Неясна снимка, моля опишете проблема"];
        const descriptionField = document.getElementById('suggestedDescription');
        const addressField = document.getElementById('finalAddress');
    
        if (defaultErrorTexts.includes(descriptionField.value.trim())) {
            displayCustomAlert('Моля, опишете проблема ръчно, преди да подадете сигнала.');
            descriptionField.classList.add('flash-error');
            setTimeout(() => { descriptionField.classList.remove('flash-error'); }, 1000);
            return;
        }
    
        if (!descriptionField.value.trim() || !addressField.value.trim()) {
            displayCustomAlert('Моля, попълнете описание и адрес.');
            return;
        }
    
        submitButton.disabled = true;
        submitButton.textContent = 'Изпращане...';
    
        // --- Стъпка 2: Събиране на ВСИЧКИ данни в един обект ---
        const trackCode = 'SV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        let compressedBase64 = null;
        const photoFile = processedFileForUpload;
    
        try {
            if (photoFile) {
                submitButton.textContent = 'Компресиране на снимка...';
                compressedBase64 = await compressImage(photoFile, 1024, 0.8);
            }
    
            const signalData = {
                description: descriptionField.value,
                address: addressField.value,
                imageUrl: compressedBase64, // Изпращаме снимката като base64
                trackCode: trackCode,
                email: document.getElementById('email').value.trim() || 'пропусни',
                institution: document.getElementById('institutionSelect').value,
                latitude: document.getElementById('lat').value,
                longitude: document.getElementById('lng').value
            };
    
            console.log("Подготвени данни за изпращане към сървъра:", signalData);
    
            // --- Стъпка 3: Изпращане на данните към правилния ендпойнт на сървъра ---
            submitButton.textContent = 'Обработка...';
            const response = await fetch('/api/submit-signal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signalData),
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                // Ако сървърът върне грешка, я показваме
                throw new Error(result.error || 'Възникна грешка на сървъра.');
            }
    
            // --- Стъпка 4: Показване на успех ---
            document.getElementById('token').textContent = result.trackCode;
            document.getElementById('signalDescriptionSummary').textContent = signalData.description;
            document.getElementById('signalInstitutionSummary').textContent = signalData.institution;
            successModalOverlay.classList.remove('hidden');
    
            const lat = signalData.latitude;
            const lng = signalData.longitude;
            const successMapContainer = document.getElementById('successMapContainer');
            
            if (lat && lng && successMapContainer) {
                successMapContainer.classList.remove('hidden');
                setTimeout(() => {
                    const successMapElement = document.getElementById('successMap');
                    if (successMapElement) {
                        if (mapModalInstance) {
                            mapModalInstance.remove();
                            mapModalInstance = null;
                        }
                        mapModalInstance = L.map('successMap').setView([lat, lng], 16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapModalInstance);
                        L.marker([lat, lng]).addTo(mapModalInstance).bindPopup('Локация на сигнала').openPopup();
                    }
                }, 150);
            } else if (successMapContainer) {
                successMapContainer.classList.add('hidden');
            }
    
        } catch (error) {
            console.error('Грешка при подаване на сигнал:', error);
            displayCustomAlert(`Възникна грешка: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Изпрати сигнал';
        }
    }
    

    // Reset form and modal
    function resetFormAndModal() {
        successModalOverlay.classList.add('hidden');
        signalForm.reset();
        resetPhotoUploadArea();
        showStep(1);
        detectLocationBtn.classList.add('hidden');
        document.getElementById('lat').value = '';
        document.getElementById('lng').value = '';
        document.getElementById('institution').value = '';
        document.querySelector('#step2 label[for="suggestedDescription"]').textContent = "Описание на проблема";
    
        const nearbySignalsContainer = document.getElementById('nearbySignalsContainer');
        const nearbySignalsList = document.getElementById('nearbySignalsList');
        nearbySignalsList.innerHTML = '';
        nearbySignalsContainer.classList.add('hidden');
    
        // НОВО: Почистване на картата
        const successMapContainer = document.getElementById('successMapContainer');
        if (successMapContainer) {
            successMapContainer.classList.add('hidden');
        }
        if (mapModalInstance) {
            mapModalInstance.remove();
            mapModalInstance = null;
        }
        // КРАЙ НА НОВИЯ КОД ЗА ПОЧИСТВАНЕ
    
        const submitButton = signalForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Изпрати сигнал';
        }
    }

    // Close modal button
    closeModalButton.addEventListener('click', resetFormAndModal);
    successModalOverlay.addEventListener('click', (e) => { if (e.target === successModalOverlay) resetFormAndModal(); });
    signalForm.addEventListener('submit', handleFormSubmit);

    // Calculate distance between two points
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // Find and display nearby signals
    async function findAndDisplayNearbySignals(currentLat, currentLng) {
        const nearbySignalsContainer = document.getElementById('nearbySignalsContainer');
        const nearbySignalsList = document.getElementById('nearbySignalsList');

        nearbySignalsList.innerHTML = '';
        nearbySignalsContainer.classList.add('hidden');

        try {
            await supabaseReady;
            const { data: signals, error } = await getSupabaseClientOrAlert()
                .from('signal')
                .select('description, date_created, latitude, longitude');

            if (error) {
                console.error('Error fetching signals for nearby check:', error);
                return;
            }

            const nearby = signals.filter(signal => {
                if (!signal.latitude || !signal.longitude) return false;
                const distance = getDistance(currentLat, currentLng, signal.latitude, signal.longitude);
                return distance <= NEARBY_SIGNALS_RADIUS;
            }).slice(0, 5);

            if (nearby.length > 0) {
                nearby.forEach(signal => {
                    const signalElement = document.createElement('div');
                    signalElement.className = 'p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-sm';
                    const formattedDate = new Date(signal.date_created).toLocaleString('bg-BG');
                    signalElement.innerHTML = `
                                <p class="font-semibold">${signal.description}</p>
                                <p class="text-xs text-gray-600">Подаден на: ${formattedDate}</p>
                            `;
                    nearbySignalsList.appendChild(signalElement);
                });
                nearbySignalsContainer.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Failed to check for nearby signals:', err);
        }
    }

    // Get formatted date time
    function getFormattedDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // Compress image
    function compressImage(file, maxWidth = 1024, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onerror = error => reject(error);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onerror = error => reject(error);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
        });
    }

    // Analyze image with OpenAI
    async function analyzeImageWithOpenAI(base64Image) {
        if (!base64Image || typeof base64Image !== 'string' || !base64Image.startsWith('data:image/')) {
            alert('Грешка: Липсва или е невалидно изображение за анализ.');
            return 'Грешка: Липсва или е невалидно изображение за анализ.';
        }
        const headers = { "Content-Type": "application/json" };
        const payload = { base64Image, systemPrompt: OPENAI_SYSTEM_PROMPT };
        try {
            const response = await fetch("/api/analyze-image", { method: "POST", headers, body: JSON.stringify(payload) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
            const data = await response.json();
            if (data && data.description) { return data.description; }
            else { return "Неясна снимка, моля опишете проблема"; }
        } catch (error) {
            console.error('Грешка при анализ на изображение:', error);
            return `Грешка при анализ: ${error.message}`;
        }
    }

    // Get institution from description
    async function getInstitutionFromDescription(description) {
        const headers = { "Content-Type": "application/json" };
        const payload = { description, systemPrompt: OPENAI_INSTITUTION_PROMPT };
        try {
            const response = await fetch("/api/get-institution", { method: "POST", headers: headers, body: JSON.stringify(payload) });
            if (!response.ok) { throw new Error(`Грешка при определяне на институция: ${response.statusText}`); }
            const data = await response.json();
            if (data && data.institution) { return data.institution.trim(); }
            else { console.error('Невалиден отговор от OpenAI при определяне на институция:', data); return "Община Варна"; }
        } catch (error) { console.error('Грешка при втората OpenAI заявка:', error); return "Община Варна"; }
    }

    // Get address from OpenCage
    async function getAddressFromOpenCage(lat, lng, source = "координати", updateInput = true) {
        const finalAddressInput = document.getElementById('finalAddress');
        const apiUrl = `/api/get-address?lat=${lat}&lng=${lng}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) { throw new Error(`OpenCage API грешка: ${response.status}`); }
            const data = await response.json();
            let displayAddress = `Адрес не е намерен за ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            if (data.results && data.results.length > 0 && data.results[0].formatted) {
                displayAddress = `${data.results[0].formatted} (от ${source})`;
            }
            if (updateInput) finalAddressInput.value = displayAddress;
            return displayAddress;
        } catch (error) {
            console.error('Грешка при зареждане на адрес от OpenCage:', error);
            const errorMsg = "Грешка при зареждане на адрес.";
            if (updateInput) finalAddressInput.value = errorMsg;
            return errorMsg;
        }
    }

    // Convert DMS to DD
    function convertDMSToDD(dms, direction) {
        // Случай 1: Данните вече са в десетичен формат (едно число)
        if (typeof dms === 'number' && !isNaN(dms)) {
            // Ако вече е число, просто го връщаме.
            // Посоката (N/S/E/W) вече трябва да е отчетена в този случай.
            return dms;
        }

        // Случай 2: Стандартен DMS формат (масив от 3 числа)
        if (Array.isArray(dms) && dms.length === 3) {
            // Проверяваме дали всички елементи са валидни числа
            if (isNaN(dms[0]) || isNaN(dms[1]) || isNaN(dms[2])) {
                return null; // Невалидни данни в масива
            }
            let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
            if (direction === "S" || direction === "W") {
                dd = dd * -1;
            }
            // Проверяваме финалния резултат
            return isNaN(dd) ? null : dd;
        }

        // Случай 3: Всичко останало е невалидно
        return null;
    }

    // Синхронизираме падащото меню със скритото поле при ръчна промяна
    institutionSelect.addEventListener('change', function() {
        institutionField.value = this.value;
    });

    // Слушател за въвеждане на текст в полето за описание за автоматичен избор на институция
    suggestedDescriptionField.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const description = suggestedDescriptionField.value.trim();

        if (description.length > 10) { 
            debounceTimer = setTimeout(async () => {
                try {
                    institutionSelect.disabled = true; 
                    const determinedInstitution = await getInstitutionFromDescription(description);
                    const matchedInstitution = findClosestInstitutionOption(determinedInstitution);

                    if (matchedInstitution) {
                        institutionSelect.value = matchedInstitution;
                        institutionField.value = matchedInstitution;
                    }
                } catch (error) {
                    console.error('Грешка при автоматичното определяне на институция от текст:', error);
                } finally {
                    institutionSelect.disabled = false;
                }
            }, 800);
        }
    });

    // Помощна функция за намиране на най-близко съвпадение на институция
    function findClosestInstitutionOption(institutionName) {
        if (!institutionName) return "Община Варна";
        institutionName = institutionName.trim().toLowerCase();
        for (const option of institutionsList) {
            if (option.trim().toLowerCase() === institutionName) {
                return option;
            }
        }
        for (const option of institutionsList) {
            if (institutionName.includes(option.trim().toLowerCase()) || option.trim().toLowerCase().includes(institutionName)) {
                return option;
            }
        }
        return "Община Варна";
    }

    populateInstitutions();
});


