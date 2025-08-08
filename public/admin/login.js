// public/admin/login.js
import { initializeAuth } from './components/auth.js';

// Тази функция ще се изпълни, когато HTML документът е зареден.
document.addEventListener('DOMContentLoaded', () => {
    // Извикваме функцията, която ще закачи event listener-а за формата.
    initializeAuth();
});