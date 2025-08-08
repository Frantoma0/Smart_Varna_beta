// services/storageService.js

import { createClient } from '@supabase/supabase-js';

// Създаваме Supabase клиент, който ще се използва само за Storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BUCKET_NAME = 'signal-photos'; // Името на вашия bucket

/**
 * Качва файл (като Buffer) в Supabase Storage и връща публичния му URL.
 * @param {Buffer} imageBuffer - Бинарното съдържание на файла.
 * @param {string} fileName - Името на файла.
 * @param {string} fileExtension - Разширението на файла (напр. 'jpeg').
 * @returns {Promise<string>} - Публичният URL на качената снимка.
 */
export async function uploadImage(imageBuffer, fileName, fileExtension) {
    const filePath = `public/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filePath, imageBuffer, {
            contentType: `image/${fileExtension}`,
            upsert: true
        });

    if (uploadError) {
        console.error('❌ Грешка при качване на снимка в Supabase Storage:', uploadError);
        throw new Error('Неуспешно качване на снимката в Supabase Storage.');
    }

    const { data: urlData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

    console.log(`✅ Снимката е качена успешно в Supabase. URL: ${urlData.publicUrl}`);
    return urlData.publicUrl;
}