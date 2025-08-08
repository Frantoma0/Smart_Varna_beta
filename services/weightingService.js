// services/weightingService.js

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Файлът 'weights.json' вече ще се използва пълноценно
const WEIGHTS_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'weights.json'), 'utf-8'));

/**
 * Изчислява първоначалната тежест на нов "мастър" сигнал.
 * Формула: Weight = (BaseWeight + UrgencyModifier) * InstitutionMultiplier
 * @param {string} title - Заглавието на сигнала.
 * @param {string} description - Пълното описание на сигнала.
 * @param {string} institution - Отговорната институция.
 * @returns {number} - Изчислената първоначална тежест.
 */
function calculateInitialWeight(title, description, institution) {
    // 1. Вземане на базовата тежест (BaseWeight)
    const baseWeight = WEIGHTS_CONFIG.base_weights[title] || WEIGHTS_CONFIG.base_weights.default;

    // 2. Изчисляване на модификатор за спешност (UrgencyModifier)
    let urgencyModifier = 0;
    const lowerCaseDescription = description.toLowerCase();
    for (const keyword in WEIGHTS_CONFIG.urgency_keywords) {
        if (lowerCaseDescription.includes(keyword)) {
            urgencyModifier += WEIGHTS_CONFIG.urgency_keywords[keyword];
        }
    }

    // 3. Прилагане на институционален мултипликатор (InstitutionMultiplier)
    const institutionSpecificMultipliers = WEIGHTS_CONFIG.institution_multipliers[institution];
    // Проверяваме дали има специфичен множител за тази институция и този тип проблем,
    // иначе използваме глобалния множител по подразбиране.
    const multiplier = (institutionSpecificMultipliers && institutionSpecificMultipliers[title])
        ? institutionSpecificMultipliers[title]
        : WEIGHTS_CONFIG.institution_multipliers.default;
        
    const finalWeight = (baseWeight + urgencyModifier) * multiplier;
    
    // Връщаме финалната тежест, форматирана до 2 знака след запетаята.
    return parseFloat(finalWeight.toFixed(2));
}

/**
 * Преизчислява тежестта на "мастър" сигнал при добавяне на дубликат.
 * Формула: NewWeight = CurrentWeight + (BaseWeight / 2) * log(CurrentDuplicateCount + 1)
 * @param {object} masterSignal - Обектът на мастър сигнала.
 * @returns {number} - Новата, увеличена тежест.
 */
function recalculateWeightOnDuplicate(masterSignal) {
    const currentWeight = masterSignal.weight || 0;
    const baseWeight = WEIGHTS_CONFIG.base_weights[masterSignal.title] || WEIGHTS_CONFIG.base_weights.default;
    
    // Взимаме броя на СЪЩЕСТВУВАЩИТЕ дубликати. Новият, който се добавя, е "+1".
    const currentDuplicateCount = masterSignal.child_count[0]?.count || 0;

    // Прилагаме логаритмичната формула за нарастване
    const increment = (baseWeight / 2) * Math.log10(currentDuplicateCount + 2);
    
    const newWeight = currentWeight + increment;
    
    return parseFloat(newWeight.toFixed(2));
}

export { calculateInitialWeight, recalculateWeightOnDuplicate };