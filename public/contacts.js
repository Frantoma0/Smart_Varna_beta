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
        const nameInput = document.getElementById('name');

        // Добавяме слушател, който не позволява въвеждането на невалидни символи
        if(nameInput) {
            nameInput.addEventListener('input', function () {
                // Премахваме всички символи, които не са букви (кирилица и латиница), интервал или тире
                this.value = this.value.replace(/[^a-zA-Zа-яА-Я\s\-]/g, '');
            });
        }

        function validateEmailStrict(email) {
            // Този RegEx е много по-обхватен и стриктен
            const emailRegex = new RegExp(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
            return emailRegex.test(String(email).toLowerCase());
        }

        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // Prevent the default form submission

            const name = document.getElementById('name').value;
            const emailInput = document.getElementById('email');
            const email = emailInput.value;
            const message = document.getElementById('message').value;

            // Basic validation
            if (!name.trim() || !email.trim() || !message.trim()) {
                alert('Моля, попълнете всички полета.');
                return;
            }

            if (!emailInput.checkValidity()) {
                emailInput.reportValidity();
                return; 
            }

            // 2. Втора, стриктна проверка с новата функция
            if (!validateEmailStrict(email)) {
                alert('Моля, въведете валиден имейл адрес. Проверете дали домейнът (напр. .com, .bg) е коректен.');
                emailInput.focus(); // Фокусираме отново върху полето за имейл
                return;
            }

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
                    // Ако сървърът върне грешка, я показваме
                    throw new Error(result.error || 'Неуспешно изпращане на съобщението.');
                }

                alert('Вашето съобщение беше изпратено успешно!');
                contactForm.reset();

            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert(`Възникна грешка: ${error.message}`);
            } finally {
                // Връщаме бутона в нормално състояние
                submitButton.disabled = false;
                submitButton.textContent = 'Изпрати';
            }
        });
    }
    
    // --- ЛОГИКА ЗА ЧАТБОТ АСИСТЕНТА ---
    const chatbotToggleBtn = document.getElementById('chatbot-toggle-btn');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
    const floatingActions = document.querySelector('.floating-actions');

    // Проверяваме дали всички елементи на чатбота съществуват
    if (chatbotToggleBtn && chatbotContainer && chatbotCloseBtn && floatingActions) {
        function openChatbot() {
            chatbotContainer.classList.add('is-open');
            floatingActions.classList.add('hidden'); // Скриваме бутона
        }

        function closeChatbot() {
            chatbotContainer.classList.remove('is-open');
            floatingActions.classList.remove('hidden'); // Показваме бутона отново
        }

        chatbotToggleBtn.addEventListener('click', openChatbot);
        chatbotCloseBtn.addEventListener('click', closeChatbot);
    }
});
