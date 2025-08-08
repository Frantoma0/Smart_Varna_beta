import * as signalRepository from '../database/signalRepository.js';
import * as aiService from './aiService.js';
import { getGeohash, getGeohashWithNeighbors } from '../utils/helpers.js';
import { recalculateWeightOnDuplicate } from './weightingService.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'settings.json'), 'utf-8'));
const PLACEHOLDER_DESCRIPTIONS = new Set(["Неясна снимка, моля опишете проблема", "Не е установена нередност, моля опишете проблема"]);

const INVALID_ADDRESS_STRINGS = new Set([
    "Грешка при зареждане на адрес.",
    "Адрес не е намерен за координати."
]);

async function findMasterSignal(newSignalData) {
    // Предварителни проверки за валидност
    if (!newSignalData.description || newSignalData.description.trim() === '') return null;
    
    let potentialDuplicates = [];

    // --- ПРИОРИТЕТ 1: Търсене по геолокация ---
    if (newSignalData.latitude && newSignalData.longitude) {
        const centralGeohash = getGeohash(newSignalData.latitude, newSignalData.longitude, SETTINGS.geohashPrecision || 7);
        if (centralGeohash) {
            const geohashesToSearch = getGeohashWithNeighbors(centralGeohash);
            potentialDuplicates = await signalRepository.findSignalsByGeohashes(geohashesToSearch);
        }
    }

    // --- РЕЗЕРВЕН ПЛАН: Търсене по адрес, АКО геолокацията не е намерила нищо ---
    if (potentialDuplicates.length === 0) {
        const address = newSignalData.address;
        if (address && !INVALID_ADDRESS_STRINGS.has(address)) {
            potentialDuplicates = await signalRepository.findSignalsByAddress(address);
        }
    }

    // Ако нито един метод не е намерил кандидати, сигналът е уникален
    if (potentialDuplicates.length === 0) {
        return null;
    }
    
    // Подаваме намерените кандидати (от който и да е метод) на AI
    const similarSignal = await aiService.findSimilarDescriptionInList(
        newSignalData.description,
        potentialDuplicates
    );

    // --- НАЧАЛО НА НОВАТА ЛОГИКА ---
    if (!similarSignal) {
        return null; // AI не е намерил достатъчно сходен сигнал
    }

    // Проверяваме статуса на намерения "мастър" сигнал
    const masterStatus = similarSignal.status?.status_types?.type;
    const isClosed = masterStatus === 'resolved' || masterStatus === 'rejected';

    if (isClosed) {
        // Ако мастърът е затворен, се преструваме, че не сме намерили такъв.
        // Това ще принуди signalService да създаде нов мастър сигнал.
        console.log(`Намерен е сходен сигнал (${similarSignal.signal_id}), но е затворен (${masterStatus}). Създава се нов сигнал.`);
        return null;
    }

    // Преизчисляваме тежестта на намерения мастър сигнал
    const newWeight = recalculateWeightOnDuplicate(similarSignal);
    
    // Актуализираме тежестта в базата данни "тихо" във фон.
    // Не блокираме процеса, дори ако това се провали.
    signalRepository.updateSignalWeight(similarSignal.signal_id, newWeight)
        .catch(err => console.error("Грешка при обновяване на тежест:", err));

    // Ако стигнем до тук, значи сме намерили отворен и подходящ мастър сигнал.
    return similarSignal;
    // --- КРАЙ НА НОВАТА ЛОГИКА ---
}

export { findMasterSignal };