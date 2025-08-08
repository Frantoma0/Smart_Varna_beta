
import { uploadImage } from './storageService.js';
import { getFormattedDateTime, getGeohash } from '../utils/helpers.js';
import { getDistance } from '../utils/helpers.js'; // Ще създадем този файл
import * as signalRepository from '../database/signalRepository.js';
import { getTieredWeightAI } from './aiService.js';
import { findMasterSignal } from './duplicationService.js';
import { generateSignalTitleAI } from './aiService.js'; 
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
// --- Инициализация на Supabase клиента (трябва да е достъпен тук) ---
const SETTINGS = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'settings.json'), 'utf-8'));


// --- Основна бизнес логика ---

export async function createSignal(data) {
    let citizenId = null;
    let finalImageUrl = null;

    // Стъпка 0: Качване на снимка
    if (data.imageUrl) {
        console.log('🖼️ Получена е снимка (base64). Предавам към Storage Service...');
        const base64Data = data.imageUrl.split(';base64,').pop();
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileExtension = data.imageUrl.substring("data:image/".length, data.imageUrl.indexOf(";base64"));
        const fileName = `photo_${data.trackCode}.${fileExtension}`;
        
        // Просто извикваме новата услуга
        finalImageUrl = await uploadImage(imageBuffer, fileName, fileExtension);
    }

    // Стъпка 1: Управление на гражданин
    if (data.email && !['пропусни', 'не'].includes(data.email)) {
        const existingCitizen = await signalRepository.findCitizenByEmail(data.email);
        if (existingCitizen) {
            await signalRepository.updateCitizenSignalCount(existingCitizen.citizen_id, existingCitizen.total_signals + 1);
            citizenId = existingCitizen.citizen_id;
        } else {
            const newCitizen = await signalRepository.createCitizen(data.email, getFormattedDateTime());
            citizenId = newCitizen.citizen_id;
        }
    } else {
        const anonCitizen = await signalRepository.createAnonymousCitizen();
        citizenId = anonCitizen.citizen_id;
    }
    // Стъпка 2: Генериране на заглавие
    const title = await generateSignalTitleAI(data.description);
    const latitude = parseFloat(data.latitude) || null;
    const longitude = parseFloat(data.longitude) || null;

    // Стъпка 3: Проверка за дубликати (единствено чрез новата услуга)
    const masterSignal = await findMasterSignal({
        description: data.description,
        latitude: latitude,
        longitude: longitude,
        address: data.address
    });


    // Стъпка 4: Изчисляване на Geohash
    const geohash = getGeohash(latitude, longitude, SETTINGS.geohashPrecision || 7);
    
    // Стъпка 5: Запис в базата данни
    const formattedDate = getFormattedDateTime();
    const commonSignalData = {
        title,
        description: data.description,
        adress: data.address,
        image_url: finalImageUrl,
        date_created: formattedDate,
        tracking_code: data.trackCode,
        citizen_id: citizenId,
        institution: data.institution,
        latitude: parseFloat(data.latitude) || null,
        longitude: parseFloat(data.longitude) || null,
        geohash: geohash
    };
    if (masterSignal) {
        // Записваме като дъщерен сигнал
        const { geohash, ...childFields } = commonSignalData;
        const childData = { ...childFields, status_id: masterSignal.status_id, signal_id: masterSignal.signal_id };
        await signalRepository.saveChildSignal(childData);
    } else {
        // Записваме като нов, главен сигнал
        const statusData = await signalRepository.createStatus(
            data.trackCode, 'Получен сигнал', formattedDate, '98e5cc79-e763-4e41-b1c2-b0303aa8f759'
        );
        
        console.log("Определяне на тежест чрез тиерова класификация от AI...");
        // Извикваме новата, опростена функция, която връща директно финалната тежест
        const initialWeight = await getTieredWeightAI(data.description);
        console.log(`AI определи тежест: ${initialWeight}`);

        const signalData = { ...commonSignalData, status_id: statusData.status_id, weight: initialWeight };
        await signalRepository.saveMasterSignal(signalData);
    }

    return { success: true, trackCode: data.trackCode };
}