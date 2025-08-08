// database/signalRepository.js
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// --- Инициализация на Supabase клиента (централизирано тук) ---
const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- Функции за работа със Storage ---
export async function uploadPhoto(filePath, imageBuffer, contentType) {
    const { data, error } = await supabase.storage
        .from('signal-photos')
        .upload(filePath, imageBuffer, { contentType, upsert: true });

    if (error) throw new Error(`Грешка при качване в Supabase: ${error.message}`);
    return data;
}

export function getPublicUrl(path) {
    const { data } = supabase.storage.from('signal-photos').getPublicUrl(path);
    return data.publicUrl;
}

// --- Функции за работа с 'citizens' ---
export async function findCitizenByEmail(email) {
    const { data, error } = await supabase
        .from('citizens')
        .select('citizen_id, total_signals')
        .eq('email', email)
        .single();

    // Грешка 'PGRST116' означава 'не са намерени редове', което е очаквано и не е грешка
    if (error && error.code !== 'PGRST116') {
        throw new Error(`Грешка при търсене на гражданин: ${error.message}`);
    }
    return data;
}

export async function updateCitizenSignalCount(citizenId, newCount) {
    const { error } = await supabase
        .from('citizens')
        .update({ total_signals: newCount })
        .eq('citizen_id', citizenId);

    if (error) throw new Error(`Грешка при обновяване на гражданин: ${error.message}`);
}

export async function createCitizen(email, registrationDate) {
    const { data, error } = await supabase
        .from('citizens')
        .insert({ email: email, total_signals: 1, registration_date: registrationDate })
        .select('citizen_id')
        .single();

    if (error) throw new Error(`Грешка при създаване на гражданин: ${error.message}`);
    return data;
}

export async function createAnonymousCitizen() {
    const { data, error } = await supabase
        .from('citizens')
        .insert({})
        .select('citizen_id')
        .single();

    if (error) throw new Error(`Грешка при създаване на анонимен гражданин: ${error.message}`);
    return data;
}

// --- Функции за работа със 'status' ---
export async function createStatus(trackingCode, description, dateChanged, statusTypeId) {
    const { data, error } = await supabase
        .from('status')
        .insert({ description, date_changed: dateChanged, tracking_code: trackingCode, status_type_id: statusTypeId })
        .select('status_id')
        .single();
        
    if (error) throw new Error(`Грешка при създаване на статус: ${error.message}`);
    return data;
}
// --- НАЧАЛО НА КОРЕКЦИЯТА ---
/**
 * Извлича всички възможни типове статуси от базата данни.
 * @returns {Promise<object[]>}
 */
export async function getAllStatusTypes() {
    const { data, error } = await supabase
        .from('status_types')
        .select('status_type_id, type, Description')
        // Добра практика е да има колона за подредба (напр. order_key), за да идват винаги в един и същи ред.
        // Ако нямате такава, може да премахнете следващия ред.

    if (error) {
        throw new Error(`Грешка при извличане на типовете статуси: ${error.message}`);
    }

    // Преобразуваме имената на колоните към това, което очаква фронтенда (id, label, type)
    return data.map(status => ({
        id: status.status_type_id,
        label: status.Description,
        type: status.type
    }));
}

/**
 * Извлича всички главни сигнали с информация за техния статус и брой дъщерни сигнали.
 * @returns {Promise<object[]>}
 */
export async function getAllMasterSignals() {
   
    const { data, error } = await supabase
        .from('signal')
        .select(`
            signal_id,
            date_created,
            title,
            image_url,
            description,
            adress,
            institution,
            tracking_code,
            weight,
            status:status_id ( 
                status_id,
                description,
                status_types:status_type_id ( type, Description )
            ),
            signal_child ( 
                signal_child_id,
                date_created,
                title,
                image_url,
                description,
                adress,
                institution,
                tracking_code,
                status:status_id (
                    status_id,
                    description,
                    status_types:status_type_id ( type, Description )
                )
            )
        `)
        .order('date_created', { ascending: false });

    if (error) {
        // Тази грешка ще се покаже в конзолата на сървъра, ако все още има проблем
        console.error("Supabase грешка при извличане на главни сигнали:", error);
        throw new Error(`Грешка при извличане на главни сигнали: ${error.message}`);
    }

    // Преобразуваме данните в по-удобен формат
    return data.map(signal => ({
        id: signal.signal_id,
        date: signal.date_created,
        title: signal.title,
        imageUrl: signal.image_url,
        description: signal.description,
        address: signal.adress,
        institution: signal.institution,
        trackCode: signal.tracking_code,
        status: {
            // Добавяме проверка, в случай че status или status_types са null
            type: signal.status?.status_types?.type || 'unknown',
            label: signal.status?.status_types?.Description || 'Неизвестен'
        },
        childTrackCodes: signal.signal_child.map(c => c.tracking_code), 
        weight: signal.weight,
        childCount: signal.signal_child.length
    }));
}
/**
 * Извлича пълните детайли за един главен сигнал по неговия ID.
 * @param {string} signalId - UUID на сигнала.
 * @returns {Promise<object>}
 */
export async function getSignalDetailsById(signalId) {
    const { data, error } = await supabase
        .from('signal')
        .select(`
            signal_id,
            date_created,
            title,
            description,
            adress,
            image_url,
            latitude,
            longitude,
            institution,
            tracking_code,
            status:status_id (*, status_types:status_type_id (type, Description)),
            citizen:citizen_id (email, total_signals),
            childSignals:signal_child (
                description,
                date_created,
                tracking_code,
                citizen:citizen_id (email)
            )
        `)
        .eq('signal_id', signalId)
        .single();

    if (error) {
        console.error(`Supabase грешка при извличане на детайли за сигнал ${signalId}:`, error);
        throw new Error(`Грешка при извличане на детайли за сигнал: ${error.message}`);
    }

    if (!data) {
        throw new Error('Сигналът не е намерен.');
    }
    
    return {
        id: data.signal_id,
        date: data.date_created,
        title: data.title,
        trackCode: data.tracking_code,
        description: data.description,
        address: data.adress,
        institution: data.institution,
        citizen: {
            email: data.citizen?.email || 'Анонимен',
            total_signals: data.citizen?.total_signals || 0
        },
        childSignals: data.childSignals.map(child => ({
            description: child.description,
            date: child.date_created,
            trackCode: child.tracking_code,
            email: child.citizen?.email || 'Анонимен'
        })),
        imageUrl: data.image_url,
        latitude: data.latitude,
        longitude: data.longitude,
        status: {
            id: data.status?.status_id,
            type: data.status?.status_types?.type || 'unknown',
            label: data.status?.status_types?.Description || 'Неизвестен'
        }
    };
}
// --- Функции за работа със 'signal' и 'signal_child' ---
export async function findPotentialDuplicateSignals(institution) {
    const { data, error } = await supabase
        .from('signal')
        .select('signal_id, description, latitude, longitude, status_id')
        .ilike('institution', institution);

    if (error) throw new Error(`Грешка при търсене на дубликати: ${error.message}`);
    return data;
}

export async function saveChildSignal(childData) {
    const { error } = await supabase.from('signal_child').insert(childData);
    if (error) throw new Error(`Грешка при запис на дъщерен сигнал: ${error.message}`);
}

const DUPLICATION_CHECK_COLUMNS = `
    signal_id, 
    description, 
    latitude, 
    longitude,
    weight,
    status_id, 
    child_count:signal_child(count),
    status:status_id ( 
        status_types:status_type_id ( type ) 
    )
`;

/**
*@param {string[]} geohashes
*@returns {Promise<object[]>}*/
export async function findSignalsByGeohashes(geohashes) {
    if (!geohashes || geohashes.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('signal')
        .select(DUPLICATION_CHECK_COLUMNS) // <-- ПРОМЯНА ТУК
        .in('geohash', geohashes);

    if (error) {
        console.error("Грешка при търсене по geohash:", error);
        throw new Error(`Грешка при търсене на близки сигнали: ${error.message}`);
    }
    return data;
}

/**
 * Намира сигнали по точен, нечувствителен към регистъра, текстов адрес.
 * @param {string} address - Текстовият адрес за търсене.
 * @returns {Promise<object[]>}
 */
export async function findSignalsByAddress(address) {
    if (!address) {
        return [];
    }
    
    const { data, error } = await supabase
        .from('signal')
        .select(DUPLICATION_CHECK_COLUMNS) // <-- ПРОМЯНА ТУК
        .ilike('adress', address);

    if (error) {
        console.error("Грешка при търсене по адрес:", error);
        throw new Error(`Грешка при търсене на сигнали по адрес: ${error.message}`);
    }
    return data;
}

export async function saveMasterSignal(signalData) {
    // signalData вече трябва да съдържа и 'geohash'
    const { error } = await supabase.from('signal').insert(signalData);
    if (error) throw new Error(`Грешка при запис на главен сигнал: ${error.message}`);
}
/**
 * Обновява само тежестта на конкретен главен сигнал.
 * @param {string} signalId 
 * @param {number} newWeight 
 */
export async function updateSignalWeight(signalId, newWeight) {
    const { error } = await supabase
        .from('signal')
        .update({ weight: newWeight })
        .eq('signal_id', signalId);

    if (error) {
        throw new Error(`Грешка при обновяване на тежестта на сигнала: ${error.message}`);
    }
}
/**
 * Обновява заглавието на конкретен сигнал по неговия код за проследяване.
 * @param {string} trackCode - Кодът за проследяване на сигнала.
 * @param {string} newTitle - Новото заглавие.
 */
export async function updateSignalTitle(trackCode, newTitle) {
    const { error } = await supabase
        .from('signal')
        .update({ title: newTitle })
        .eq('tracking_code', trackCode);

    if (error) {
        // Проверяваме дали грешката е, че не е намерен такъв сигнал
        if (error.code === 'PGRST204') { 
            // Опитваме да обновим в signal_child
            const { error: childError } = await supabase
                .from('signal_child')
                .update({ title: newTitle })
                .eq('tracking_code', trackCode);
            
            if(childError) {
                 throw new Error(`Грешка при обновяване на заглавие (дъщерен сигнал): ${childError.message}`);
            }
        } else {
             throw new Error(`Грешка при обновяване на заглавие (главен сигнал): ${error.message}`);
        }
    }
}

/**
 * Обновява status_id на конкретен главен сигнал.
 * @param {string} signalId 
 * @param {string} newStatusId 
 */
export async function updateSignalStatus(signalId, newStatusId) {
    // Обновяваме статуса на главния сигнал
    const { error: masterError } = await supabase
        .from('signal')
        .update({ status_id: newStatusId })
        .eq('signal_id', signalId);

    if (masterError) {
        throw new Error(`Грешка при обновяване на статус (главен): ${masterError.message}`);
    }

    // Обновяваме статуса и на всички негови дъщерни сигнали
    const { error: childError } = await supabase
        .from('signal_child')
        .update({ status_id: newStatusId })
        .eq('signal_id', signalId);
    
    if (childError) {
        // Логваме, но не хвърляме грешка, защото главният е по-важен
        console.error(`Грешка при обновяване на статус (дъщерен): ${childError.message}`);
    }
}

/**
 * Взима имейлите на всички граждани, свързани с даден сигнал (основен + дъщерни).
 * @param {string} signalId 
 * @returns {Promise<{emails: string[], trackCode: string, title: string}>}
 */
export async function getEmailsForSignal(signalId) {
    const { data, error } = await supabase
        .from('signal')
        .select(`
            tracking_code,
            title,
            citizen:citizen_id ( email ),
            signal_child ( citizen:citizen_id ( email ) )
        `)
        .eq('signal_id', signalId)
        .single();
    
    if (error) {
        throw new Error(`Грешка при извличане на имейли за сигнал ${signalId}: ${error.message}`);
    }

    if (!data) return { emails: [], trackCode: '', title: '' };

    const emails = new Set(); // Използваме Set, за да избегнем дубликати

    // Добавяме имейла на основния подател, ако е валиден
    if (data.citizen && data.citizen.email && !['пропусни', 'не'].includes(data.citizen.email)) {
        emails.add(data.citizen.email);
    }
    
    // Добавяме имейлите от дъщерните сигнали
    data.signal_child.forEach(child => {
        if (child.citizen && child.citizen.email && !['пропусни', 'не'].includes(child.citizen.email)) {
            emails.add(child.citizen.email);
        }
    });

    return {
        emails: Array.from(emails),
        trackCode: data.tracking_code,
        title: data.title
    };
}