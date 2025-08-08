// public/admin/components/auth.js (Опростена версия - НЕ Е МОДУЛ)

// Тази функция ще се изпълни, когато целият HTML е зареден.
document.addEventListener('DOMContentLoaded', () => {
    
    // Дефинираме всичко ВЪТРЕ в този listener, за да сме сигурни, че елементите съществуват.
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Ако намерим форма за вход, закачаме нейната логика.
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            // СПИРАМЕ стандартното изпращане на формата
            event.preventDefault(); 
            
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = '';

            const username = event.target.username.value;
            const password = event.target.password.value;

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const result = await response.json();

                if (response.ok) {
                    window.location.href = '/admin/dashboard.html';
                } else {
                    errorMessage.textContent = result.error || 'Възникна грешка.';
                }
            } catch (error) {
                console.error("Login Fetch Error:", error);
                errorMessage.textContent = 'Грешка при връзка със сървъра.';
            }
        });
    }

    // Ако намерим бутон за изход, закачаме неговата логика.
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/admin/login.html';
        });
    }
});