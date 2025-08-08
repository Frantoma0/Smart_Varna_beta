// services/aiService.js

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_TITLE_PROMPT = readFileSync(join(__dirname, '..', 'prompts', 'title_prompt.txt'), 'utf-8');
const AI_BATCH_SIMILARITY_PROMPT = readFileSync(join(__dirname, '..', 'prompts', 'batch_similarity_prompt.txt'), 'utf-8');
const AI_TIER_CLASSIFICATION_PROMPT = readFileSync(join(__dirname, '..', 'prompts', 'tier_classification_prompt.txt'), 'utf-8');

// --- Функции, които комуникират с OpenAI ---

async function generateSignalTitleAI(description) {
    const payload = {
        model: 'gpt-5',
        messages: [
            { role: 'system', content: AI_TITLE_PROMPT },
            { role: 'user', content: description }
        ],
        max_tokens: 15,
        temperature: 0.2
    };
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('OpenAI API грешка при генериране на заглавие');
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Грешка при AI генериране на заглавие:', error);
        return "Общ сигнал";
    }
}

async function findSimilarDescriptionInList(newDescription, existingSignals) {
    if (!existingSignals || existingSignals.length === 0) return null;

    const existingDescriptionsText = existingSignals
        .map(signal => `ID: ${signal.signal_id}\nОписание: "${signal.description}"`)
        .join('\n---\n');

    const userContent = `Ново описание: "${newDescription}"\n\nСъществуващи описания:\n${existingDescriptionsText}`;

    const payload = {
        model: 'gpt-5',
        messages: [ { role: 'system', content: AI_BATCH_SIMILARITY_PROMPT }, { role: 'user', content: userContent } ],
        max_tokens: 40, // Малко повече, за да хванем UUID
        temperature: 0.0
    };

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('OpenAI API грешка при групово сравнение');
        
        const data = await response.json();
        const resultText = data.choices[0].message.content.trim();

        if (resultText.toLowerCase() === 'none') return null;
        
        return existingSignals.find(s => s.signal_id === resultText) || null;
    } catch (error) {
        console.error('Грешка при AI групово сравнение:', error);
        return null;
    }
}
/**
 * Взима финалната тежест на сигнала, определена от AI според тиеровата система.
 * @param {string} description - Описанието на сигнала.
 * @returns {Promise<number>} - Финалната тежест (1-100), определена от AI.
 */
async function getTieredWeightAI(description) {
    const payload = {
        model: 'gpt-5',
        // Тази настройка е силно препоръчителна - гарантира, че отговорът ВИНАГИ ще е валиден JSON
        response_format: { "type": "json_object" }, 
        messages: [
            { role: 'system', content: AI_TIER_CLASSIFICATION_PROMPT },
            { role: 'user', content: `Описание: "${description}"` }
        ],
        max_tokens: 250, // Достатъчно място за отговора
        temperature: 0.1  // Ниска температура за по-консистентни и предвидими резултати
    };
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('OpenAI API грешка при тиерова класификация');
        
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content.trim());

        console.log('AI Tier Classification Result:', result); // Логваме целия отговор за прозрачност
        
        // Връщаме директно финалния резултат от промпта
        return result.severity_score || 10; 
    } catch (error) {
        console.error('Грешка при AI тиерова класификация:', error);
        return 10; // Връщаме ниска тежест по подразбиране при грешка
    }
}
export { generateSignalTitleAI, findSimilarDescriptionInList, getTieredWeightAI };
