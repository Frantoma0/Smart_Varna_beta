document.addEventListener('DOMContentLoaded', function () {
    // Hamburger Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Contact Form Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        // Дефинираме всички полета тук, за да са достъпни навсякъде
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');

        // Слушател, който не позволява въвеждането на невалидни символи в името
        if (nameInput) {
            nameInput.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-zA-Zа-яА-Я\s\-]/g, '');
            });
        }

        // Слушател, който изчиства персонализираната грешка за имейл,
        // веднага щом потребителят започне да го коригира.
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                emailInput.setCustomValidity(''); // Ключова стъпка: изчиства грешката
            });
        }

        // Логика при изпращане на формата
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // Спираме презареждането на страницата

            const name = nameInput.value;
            const email = emailInput.value;
            const message = messageInput.value;

            // Обща проверка дали полетата са попълнени. Ако не са, показваме балонче.
            if (!name.trim() || !email.trim() || !message.trim()) {
                if (!name.trim()) nameInput.reportValidity();
                else if (!email.trim()) emailInput.reportValidity();
                else messageInput.reportValidity();
                return;
            }

            // Стриктна проверка за валидност на имейла
            const strictEmailPattern = /^[^\s@]+@[^\s@.]+\.[^\s@.]{2,}$/;
            if (!strictEmailPattern.test(email)) {
                // Задаваме персонализирано съобщение за грешка
                emailInput.setCustomValidity('Моля, въведете същестуващ имейл адрес.');
                
                // Казваме на браузъра да покаже балончето с нашето съобщение
                emailInput.reportValidity();
                
                return; // Спираме изпълнението
            }

            // Ако всичко е наред, продължаваме с изпращането
            const submitButton = contactForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Изпращане...';

            try {
                const response = await fetch('/api/send-contact-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, message }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Неуспешно изпращане на съобщението.');
                }

                alert('Вашето съобщение беше изпратено успешно!');
                contactForm.reset();

            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert(`Възникна грешка: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Изпрати';
            }
        });
    }
});
