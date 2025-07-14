class MindfulAIApp {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.currentChatId = null;
        this.selectedAssistant = null;
        this.assistants = [];
        this.eventSource = null;
        this.insights = [];
        this.savedMemories = [];
        this.gamificationData = {};
        
        // DOM элементы
        this.elements = {
            assistantSelection: document.getElementById('assistant-selection'),
            chatScreen: document.getElementById('chat-screen'),
            assistantsGrid: document.getElementById('assistants-grid'),
            loading: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message'),
            backBtn: document.getElementById('back-btn'),
            currentAssistantName: document.getElementById('current-assistant-name'),
            currentAssistantDescription: document.getElementById('current-assistant-description'),
            messagesContainer: document.getElementById('messages-container'),
            messageForm: document.getElementById('message-form'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            charCounter: document.getElementById('char-counter'),
            // Новые элементы для инсайтов
            insightsPanel: document.getElementById('insights-panel'),
            insightsContainer: document.getElementById('insights-container'),
            toggleInsightsBtn: document.getElementById('toggle-insights'),
            memoryMapBtn: document.getElementById('memory-map-btn'),
            memoryModal: document.getElementById('memory-modal'),
            closeMemoryModalBtn: document.getElementById('close-memory-modal'),
            memoryContainer: document.getElementById('memory-container'),
            // Геймификация
            levelDisplay: document.getElementById('level-display'),
            experienceBar: document.getElementById('experience-bar'),
            experienceText: document.getElementById('experience-text'),
            achievementsBtn: document.getElementById('achievements-btn'),
            achievementsModal: document.getElementById('achievements-modal'),
            closeAchievementsModalBtn: document.getElementById('close-achievements-modal'),
            achievementsContainer: document.getElementById('achievements-container'),
            pointsNotification: document.getElementById('points-notification')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAssistants();
        this.setupTextareaAutoResize();
    }

    setupEventListeners() {
        // Обработчик формы отправки сообщения
        this.elements.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Обработчик ввода текста
        this.elements.messageInput.addEventListener('input', () => {
            this.updateCharCounter();
            this.toggleSendButton();
        });

        // Обработчик Enter для отправки сообщения
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.elements.sendBtn.disabled) {
                    this.sendMessage();
                }
            }
        });

        // Кнопка "Назад"
        this.elements.backBtn.addEventListener('click', () => {
            this.goBackToSelection();
        });

        // Новые обработчики для инсайтов
        this.elements.toggleInsightsBtn.addEventListener('click', () => {
            this.toggleInsightsPanel();
        });

        this.elements.memoryMapBtn.addEventListener('click', () => {
            this.showMemoryModal();
        });

        this.elements.closeMemoryModalBtn.addEventListener('click', () => {
            this.hideMemoryModal();
        });

        // Закрытие модального окна по клику на фон
        this.elements.memoryModal.addEventListener('click', (e) => {
            if (e.target === this.elements.memoryModal) {
                this.hideMemoryModal();
            }
        });

        // Геймификация обработчики
        if (this.elements.achievementsBtn) {
            this.elements.achievementsBtn.addEventListener('click', () => {
                this.showAchievementsModal();
            });
        }

        if (this.elements.closeAchievementsModalBtn) {
            this.elements.closeAchievementsModalBtn.addEventListener('click', () => {
                this.hideAchievementsModal();
            });
        }

        // Закрытие модального окна достижений по клику на фон
        if (this.elements.achievementsModal) {
            this.elements.achievementsModal.addEventListener('click', (e) => {
                if (e.target === this.elements.achievementsModal) {
                    this.hideAchievementsModal();
                }
            });
        }
    }

    setupTextareaAutoResize() {
        const textarea = this.elements.messageInput;
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            const maxHeight = 120;
            const newHeight = Math.min(textarea.scrollHeight, maxHeight);
            textarea.style.height = newHeight + 'px';
        });
    }

    async loadAssistants() {
        try {
            this.showLoading(true);
            this.hideError();

            const response = await fetch(`${this.apiBase}/assistants`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const assistants = await response.json();
            this.assistants = assistants;
            this.renderAssistants(assistants);
            
        } catch (error) {
            console.error('Ошибка загрузки ассистентов:', error);
            this.showError('Не удалось загрузить список ассистентов. Убедитесь, что сервер запущен на localhost:3000');
        } finally {
            this.showLoading(false);
        }
    }

    renderAssistants(assistants) {
        const grid = this.elements.assistantsGrid;
        grid.innerHTML = '';

        // Описания для типов ассистентов
        const descriptions = {
            coach: 'Поможет достичь ваших целей и повысить мотивацию',
            therapist: 'Окажет поддержку в работе с эмоциями и стрессом',
            mentor: 'Даст мудрые советы и поделится опытом',
            friend: 'Просто поговорит и выслушает вас'
        };

        assistants.forEach(assistant => {
            const card = document.createElement('div');
            card.className = 'assistant-card';
            
            // Безопасное создание элементов без innerHTML для предотвращения XSS
            const heading = document.createElement('h3');
            heading.textContent = this.translateAssistantType(assistant.id);
            
            const description = document.createElement('p');
            description.textContent = descriptions[assistant.id] || assistant.description || 'ИИ-ассистент готов помочь вам';
            
            card.appendChild(heading);
            card.appendChild(description);
            
            card.addEventListener('click', () => {
                this.selectAssistant(assistant);
            });

            grid.appendChild(card);
        });
    }

    translateAssistantType(type) {
        const translations = {
            coach: 'Коуч',
            therapist: 'Терапевт',
            mentor: 'Ментор',
            friend: 'Друг'
        };
        return translations[type] || type;
    }

    async selectAssistant(assistant) {
        try {
            // Визуальная обратная связь
            const cards = document.querySelectorAll('.assistant-card');
            cards.forEach(card => card.classList.remove('selected'));
            event.currentTarget.classList.add('selected');

            this.selectedAssistant = assistant;
            
            // Создаем новую сессию чата
            const response = await fetch(`${this.apiBase}/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    assistantType: assistant.id
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const chatData = await response.json();
            this.currentChatId = chatData.id;
            
            // Переходим к экрану чата
            this.showChatScreen();
            
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            this.showError('Не удалось создать сессию чата. Попробуйте еще раз.');
        }
    }


    async sendMessage() {
        const messageText = this.elements.messageInput.value.trim();
        if (!messageText || !this.currentChatId) return;

        try {
            // Добавляем сообщение пользователя в интерфейс
            this.addMessage(messageText, 'user');
            
            // Очищаем поле ввода
            this.elements.messageInput.value = '';
            this.updateCharCounter();
            this.toggleSendButton();
            this.elements.messageInput.style.height = 'auto';
            
            // Показываем индикатор печати
            this.showTypingIndicator();
            
            // Отправляем сообщение на сервер
            const response = await fetch(`${this.apiBase}/chats/${this.currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: messageText
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Даем время серверу сгенерировать ответ ассистента
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Получаем обновленную сессию с новыми сообщениями
            const chatResponse = await fetch(`${this.apiBase}/chats/${this.currentChatId}`);
            
            if (!chatResponse.ok) {
                throw new Error(`HTTP error! status: ${chatResponse.status}`);
            }
            
            const chatData = await chatResponse.json();
            
            // Убираем индикатор печати
            this.hideTypingIndicator();
            
            // Находим последнее сообщение ассистента
            const assistantMessages = chatData.messages
                .filter(msg => msg.role === 'assistant')
                .sort((a, b) => b.order - a.order);
                
            if (assistantMessages.length > 0) {
                const lastAssistantMessage = assistantMessages[0];
                this.addMessage(lastAssistantMessage.content, 'assistant');
            }
            
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            this.hideTypingIndicator();
            this.addMessage('Извините, произошла ошибка при отправке сообщения. Попробуйте еще раз.', 'assistant', true);
        }
    }

    addMessage(content, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        if (isError) {
            messageDiv.style.backgroundColor = '#ffebee';
            messageDiv.style.color = '#c62828';
            messageDiv.style.borderColor = '#e57373';
        }
        
        const messageContent = document.createElement('div');
        messageContent.textContent = content;
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        // Удаляем приветственное сообщение при первом сообщении
        const welcomeMessage = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage && sender === 'user') {
            welcomeMessage.remove();
        }
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        // Убираем существующий индикатор, если есть
        this.hideTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        this.elements.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = this.elements.messagesContainer.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    updateCharCounter() {
        const length = this.elements.messageInput.value.length;
        this.elements.charCounter.textContent = `${length}/1000`;
        
        if (length > 900) {
            this.elements.charCounter.style.color = '#e74c3c';
        } else if (length > 800) {
            this.elements.charCounter.style.color = '#f39c12';
        } else {
            this.elements.charCounter.style.color = '#666';
        }
    }

    toggleSendButton() {
        const hasText = this.elements.messageInput.value.trim().length > 0;
        this.elements.sendBtn.disabled = !hasText;
    }

    showLoading(show) {
        if (show) {
            this.elements.loading.classList.remove('hidden');
            this.elements.assistantsGrid.classList.add('hidden');
        } else {
            this.elements.loading.classList.add('hidden');
            this.elements.assistantsGrid.classList.remove('hidden');
        }
    }

    showError(message) {
        this.elements.errorMessage.querySelector('p').textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
        this.elements.assistantsGrid.classList.add('hidden');
    }

    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    // ===== МЕТОДЫ ДЛЯ РАБОТЫ С ИНСАЙТАМИ =====

    connectToAnalysisStream() {
        if (!this.currentChatId) return;

        // Закрываем предыдущее соединение, если оно есть
        this.disconnectFromAnalysisStream();

        const streamUrl = `${this.apiBase}/analysis/stream/${this.currentChatId}`;
        
        try {
            this.eventSource = new EventSource(streamUrl);
            
            this.eventSource.onopen = () => {
                console.log('Подключено к потоку анализа');
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const analysisData = JSON.parse(event.data);
                    this.handleAnalysisEvent(analysisData);
                } catch (error) {
                    console.error('Ошибка парсинга данных анализа:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('Ошибка соединения с потоком анализа:', error);
                // Попытка переподключения через 5 секунд
                setTimeout(() => {
                    if (this.currentChatId) {
                        this.connectToAnalysisStream();
                    }
                }, 5000);
            };

        } catch (error) {
            console.error('Ошибка создания EventSource:', error);
        }
    }

    disconnectFromAnalysisStream() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    handleAnalysisEvent(analysisData) {
        if (analysisData.type === 'insight') {
            this.displayInsight(analysisData.data);
            this.showInsightsPanel();
        }
    }

    displayInsight(insight) {
        this.insights.push(insight);
        
        const insightElement = this.createInsightElement(insight);
        
        // Удаляем сообщение "нет инсайтов" если оно есть
        const noInsights = this.elements.insightsContainer.querySelector('.no-insights');
        if (noInsights) {
            noInsights.remove();
        }
        
        this.elements.insightsContainer.appendChild(insightElement);
        
        // Прокручиваем к новому инсайту
        insightElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    createInsightElement(insight) {
        const insightDiv = document.createElement('div');
        insightDiv.className = 'insight-item';
        insightDiv.dataset.insightId = insight.id;
        
        // Безопасное создание элементов без innerHTML
        const heading = document.createElement('h4');
        heading.textContent = insight.title || 'Инсайт';
        
        const content = document.createElement('p');
        content.textContent = insight.content;
        
        const meta = document.createElement('div');
        meta.className = 'insight-meta';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'insight-time';
        timeSpan.textContent = new Date(insight.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = 'Сохранить в память';
        saveBtn.addEventListener('click', () => this.saveToMemory(insight.id));
        
        meta.appendChild(timeSpan);
        meta.appendChild(saveBtn);
        
        insightDiv.appendChild(heading);
        insightDiv.appendChild(content);
        insightDiv.appendChild(meta);
        
        return insightDiv;
    }

    showInsightsPanel() {
        this.elements.insightsPanel.classList.remove('hidden');
    }

    hideInsightsPanel() {
        this.elements.insightsPanel.classList.add('hidden');
    }

    toggleInsightsPanel() {
        this.elements.insightsPanel.classList.toggle('hidden');
    }

    async saveToMemory(insightId) {
        const insight = this.insights.find(i => i.id === insightId);
        if (!insight) return;

        try {
            const response = await fetch(`${this.apiBase}/memory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: 'default-user',
                    chatId: this.currentChatId,
                    insightId: insight.id,
                    content: insight.content,
                    title: insight.title,
                    type: insight.type || 'insight',
                    sourceType: 'chat',
                    sourceId: this.currentChatId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const memoryData = await response.json();
            this.savedMemories.push(memoryData);

            // Обновляем кнопку
            const saveBtn = document.querySelector(`[data-insight-id="${insightId}"] .save-btn`);
            if (saveBtn) {
                saveBtn.textContent = 'Сохранено';
                saveBtn.disabled = true;
            }

            console.log('Инсайт сохранён в память');

        } catch (error) {
            console.error('Ошибка сохранения в память:', error);
        }
    }

    async loadMemoryMap() {
        try {
            const response = await fetch(`${this.apiBase}/memory/default-user?chatId=${this.currentChatId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const memories = data.memories || data; // Поддержка обоих форматов ответа
            this.savedMemories = memories;
            this.renderMemoryMap(memories);

        } catch (error) {
            console.error('Ошибка загрузки карты памяти:', error);
            this.renderMemoryMap([]);
        }
    }

    renderMemoryMap(memories) {
        const container = this.elements.memoryContainer;
        container.innerHTML = '';

        if (memories.length === 0) {
            container.innerHTML = '<div class="no-memory"><p>Сохранённых инсайтов пока нет</p></div>';
            return;
        }

        memories.forEach(memory => {
            const memoryElement = this.createMemoryElement(memory);
            container.appendChild(memoryElement);
        });
    }

    createMemoryElement(memory) {
        const memoryDiv = document.createElement('div');
        memoryDiv.className = 'memory-item';
        
        // Безопасное создание элементов без innerHTML
        const heading = document.createElement('h4');
        heading.textContent = memory.title || 'Сохранённый инсайт';
        
        const content = document.createElement('p');
        content.textContent = memory.content;
        
        const meta = document.createElement('div');
        meta.className = 'memory-meta';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'memory-date';
        dateSpan.textContent = new Date(memory.createdAt).toLocaleDateString('ru-RU');
        
        const typeSpan = document.createElement('span');
        typeSpan.className = 'memory-type';
        typeSpan.textContent = memory.type || 'insight';
        
        meta.appendChild(dateSpan);
        meta.appendChild(typeSpan);
        
        memoryDiv.appendChild(heading);
        memoryDiv.appendChild(content);
        memoryDiv.appendChild(meta);
        
        return memoryDiv;
    }

    showMemoryModal() {
        this.loadMemoryMap();
        this.elements.memoryModal.classList.remove('hidden');
    }

    hideMemoryModal() {
        this.elements.memoryModal.classList.add('hidden');
    }

    // ===== ОБНОВЛЕНИЯ СУЩЕСТВУЮЩИХ МЕТОДОВ =====

    // Обновляем метод showChatScreen для подключения к SSE
    showChatScreen() {
        this.elements.assistantSelection.classList.add('hidden');
        this.elements.chatScreen.classList.remove('hidden');
        
        // Обновляем информацию об ассистенте
        this.elements.currentAssistantName.textContent = this.translateAssistantType(this.selectedAssistant.id);
        this.elements.currentAssistantDescription.textContent = `Ваш персональный ${this.translateAssistantType(this.selectedAssistant.id).toLowerCase()}`;
        
        // Очищаем контейнер сообщений, кроме приветствия
        const welcomeMessage = this.elements.messagesContainer.querySelector('.welcome-message');
        this.elements.messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            this.elements.messagesContainer.appendChild(welcomeMessage);
        }
        
        // Очищаем инсайты
        this.insights = [];
        this.elements.insightsContainer.innerHTML = '<div class="no-insights"><p>Инсайты будут появляться здесь по мере анализа диалога</p></div>';
        this.hideInsightsPanel();
        
        // Подключаемся к потоку анализа
        this.connectToAnalysisStream();
        
        // Загружаем и подключаемся к данным геймификации
        this.loadGamificationData();
        this.connectToGamificationEvents();
        
        // Фокус на поле ввода
        this.elements.messageInput.focus();
    }

    // Обновляем метод goBackToSelection для отключения от SSE
    goBackToSelection() {
        this.elements.chatScreen.classList.add('hidden');
        this.elements.assistantSelection.classList.remove('hidden');
        
        // Отключаемся от потока анализа
        this.disconnectFromAnalysisStream();
        
        // Сбрасываем данные текущего чата
        this.currentChatId = null;
        this.selectedAssistant = null;
        this.insights = [];
        this.savedMemories = [];
        
        // Очищаем форму
        this.elements.messageInput.value = '';
        this.updateCharCounter();
        this.toggleSendButton();
        
        // Убираем выделение с карточек
        const cards = document.querySelectorAll('.assistant-card');
        cards.forEach(card => card.classList.remove('selected'));
        
        // Скрываем панель инсайтов и модальное окно
        this.hideInsightsPanel();
        this.hideMemoryModal();
        this.hideAchievementsModal();
        this.disconnectFromGamificationEvents();
    }

    // ===== МЕТОДЫ ДЛЯ ГЕЙМИФИКАЦИИ =====

    async loadGamificationData() {
        try {
            const response = await fetch(`${this.apiBase}/user/stats?userId=default-user`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.gamificationData = await response.json();
            this.updateGamificationDisplay();

        } catch (error) {
            console.error('Ошибка загрузки данных геймификации:', error);
        }
    }

    updateGamificationDisplay() {
        if (!this.gamificationData) return;

        const { level, experience, progressToNextLevel, expNeededForNextLevel, progressPercentage } = this.gamificationData;

        // Обновляем уровень
        if (this.elements.levelDisplay) {
            this.elements.levelDisplay.textContent = `Уровень ${level}`;
        }

        // Обновляем прогресс-бар опыта
        if (this.elements.experienceBar) {
            this.elements.experienceBar.style.width = `${progressPercentage}%`;
        }

        // Обновляем текст опыта
        if (this.elements.experienceText) {
            this.elements.experienceText.textContent = `${progressToNextLevel}/1000 XP`;
        }
    }

    async showAchievementsModal() {
        try {
            await this.loadAchievements();
            if (this.elements.achievementsModal) {
                this.elements.achievementsModal.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Ошибка показа достижений:', error);
        }
    }

    hideAchievementsModal() {
        if (this.elements.achievementsModal) {
            this.elements.achievementsModal.classList.add('hidden');
        }
    }

    async loadAchievements() {
        try {
            const response = await fetch(`${this.apiBase}/achievements/default-user`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const achievementData = await response.json();
            this.renderAchievements(achievementData);

        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
            this.renderAchievements({ unlocked: [], locked: [] });
        }
    }

    renderAchievements(achievementData) {
        const container = this.elements.achievementsContainer;
        if (!container) return;

        container.innerHTML = '';

        // Разблокированные достижения
        if (achievementData.unlocked && achievementData.unlocked.length > 0) {
            const unlockedSection = document.createElement('div');
            unlockedSection.className = 'achievements-section';
            unlockedSection.innerHTML = `
                <h3>🏆 Полученные достижения (${achievementData.unlocked.length})</h3>
                <div class="achievements-grid"></div>
            `;

            const unlockedGrid = unlockedSection.querySelector('.achievements-grid');
            achievementData.unlocked.forEach(userAchievement => {
                const achievement = userAchievement.achievement;
                const achievementElement = this.createAchievementElement(achievement, true, userAchievement.earnedAt);
                unlockedGrid.appendChild(achievementElement);
            });

            container.appendChild(unlockedSection);
        }

        // Заблокированные достижения
        if (achievementData.locked && achievementData.locked.length > 0) {
            const lockedSection = document.createElement('div');
            lockedSection.className = 'achievements-section';
            lockedSection.innerHTML = `
                <h3>🔒 Доступные достижения (${achievementData.locked.length})</h3>
                <div class="achievements-grid"></div>
            `;

            const lockedGrid = lockedSection.querySelector('.achievements-grid');
            achievementData.locked.forEach(achievement => {
                const achievementElement = this.createAchievementElement(achievement, false);
                lockedGrid.appendChild(achievementElement);
            });

            container.appendChild(lockedSection);
        }

        if ((!achievementData.unlocked || achievementData.unlocked.length === 0) &&
            (!achievementData.locked || achievementData.locked.length === 0)) {
            container.innerHTML = '<div class="no-achievements"><p>Достижения пока не загружены</p></div>';
        }
    }

    createAchievementElement(achievement, isUnlocked, earnedAt) {
        const achievementDiv = document.createElement('div');
        achievementDiv.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        // Безопасное создание элементов без innerHTML
        const iconDiv = document.createElement('div');
        iconDiv.className = 'achievement-icon';
        iconDiv.textContent = achievement.icon || '🏆';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'achievement-content';
        
        const heading = document.createElement('h4');
        heading.textContent = achievement.name;
        
        const description = document.createElement('p');
        description.textContent = achievement.description;
        
        const pointsDiv = document.createElement('div');
        pointsDiv.className = 'achievement-points';
        pointsDiv.textContent = `+${achievement.points} XP`;
        
        contentDiv.appendChild(heading);
        contentDiv.appendChild(description);
        contentDiv.appendChild(pointsDiv);
        
        if (isUnlocked && earnedAt) {
            const earnedSpan = document.createElement('span');
            earnedSpan.className = 'earned-date';
            earnedSpan.textContent = `Получено: ${new Date(earnedAt).toLocaleDateString('ru-RU')}`;
            contentDiv.appendChild(earnedSpan);
        }
        
        achievementDiv.appendChild(iconDiv);
        achievementDiv.appendChild(contentDiv);
        
        return achievementDiv;
    }

    showPointsNotification(points, action) {
        if (!this.elements.pointsNotification) return;

        const actionTexts = {
            'message': 'за сообщение',
            'analysis_complete': 'за анализ',
            'insight_saved': 'за сохранение инсайта'
        };

        this.elements.pointsNotification.innerHTML = `
            <div class="points-text">+${points} XP ${actionTexts[action] || ''}</div>
        `;
        
        this.elements.pointsNotification.classList.remove('hidden');
        this.elements.pointsNotification.classList.add('show');

        // Скрываем уведомление через 3 секунды
        setTimeout(() => {
            this.elements.pointsNotification.classList.remove('show');
            setTimeout(() => {
                this.elements.pointsNotification.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    showLevelUpNotification(newLevel) {
        if (!this.elements.pointsNotification) return;

        this.elements.pointsNotification.innerHTML = `
            <div class="level-up-text">🎉 Новый уровень ${newLevel}! 🎉</div>
        `;
        
        this.elements.pointsNotification.classList.remove('hidden');
        this.elements.pointsNotification.classList.add('show', 'level-up');

        // Скрываем уведомление через 5 секунд
        setTimeout(() => {
            this.elements.pointsNotification.classList.remove('show', 'level-up');
            setTimeout(() => {
                this.elements.pointsNotification.classList.add('hidden');
            }, 300);
        }, 5000);
    }

    connectToGamificationEvents() {
        // Пока что будем периодически обновлять данные геймификации
        this.gamificationInterval = setInterval(() => {
            this.loadGamificationData();
        }, 10000); // Каждые 10 секунд
    }

    disconnectFromGamificationEvents() {
        if (this.gamificationInterval) {
            clearInterval(this.gamificationInterval);
            this.gamificationInterval = null;
        }
    }
}

// Инициализация приложения
const app = new MindfulAIApp();

// Экспорт для возможности использования в других скриптах
window.app = app;

const API_BASE_URL = 'http://localhost:3000';

// Загрузка истории чатов
app.loadChatHistory = async function () {
  const container = document.getElementById('chat-history-list');
  container.innerHTML = 'Загрузка...';

  try {
    const res = await fetch('/api/chats');
    const chats = await res.json();
    container.innerHTML = '';

    if (chats.length === 0) {
      container.innerHTML = '<p>Нет сохранённых чатов</p>';
    } else {
      chats.forEach(chat => {
        const card = document.createElement('div');
        card.className = 'assistant-card';
        card.innerHTML = `
          <h3>${chat.title || 'Без названия'}</h3>
          <p>Ассистент: ${chat.assistantId}</p>
          <p>${new Date(chat.createdAt).toLocaleDateString()}</p>
        `;
        card.onclick = () => app.loadChat(chat.id);
        container.appendChild(card);
      });
    }

    app.showScreen('chat-history-screen');
  } catch (error) {
    container.innerHTML = '<p>Ошибка загрузки истории чатов</p>';
  }
};

// Загрузка конкретного чата по ID
app.loadChat = async function (chatId) {
  try {
    const res = await fetch(`/api/chats/${chatId}`);
    const session = await res.json();
    app.currentSession = session;
    app.showScreen('chat-screen');

    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';

    session.messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message ${msg.role}`;
      div.innerHTML = `<p>${msg.content}</p>`;
      messagesContainer.appendChild(div);
    });

    document.getElementById('current-assistant-name').textContent = session.assistantId;
    document.getElementById('current-assistant-description').textContent = ''; // можно заполнить, если есть

  } catch (e) {
    alert('Ошибка загрузки чата');
  }
};

// Поиск по памяти (инсайтам)
app.searchMemory = async function () {
  const query = document.getElementById('memory-search-input').value.trim();
  const container = document.getElementById('memory-container');
  container.innerHTML = '';

  if (!query) {
    container.innerHTML = '<div class="no-memory"><p>Введите запрос для поиска.</p></div>';
    return;
  }

  try {
    const res = await fetch('/api/memory/search?query=' + encodeURIComponent(query));
    const results = await res.json();

    if (results.length === 0) {
      container.innerHTML = '<div class="no-memory"><p>Ничего не найдено</p></div>';
    } else {
      results.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'memory-item';
        div.innerHTML = `
          <h4>${entry.title || 'Инсайт'}</h4>
          <p>${entry.content}</p>
          <div class="memory-meta">
            <span class="memory-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
            <span class="memory-type">${entry.tags?.join(', ') || 'Без тегов'}</span>
          </div>
        `;
        container.appendChild(div);
      });
    }
  } catch (e) {
    container.innerHTML = '<div class="no-memory"><p>Ошибка при поиске инсайтов</p></div>';
  }
};

// Навешивание обработчика на кнопку "История чатов"
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('go-to-history')?.addEventListener('click', () => {
    app.loadChatHistory();
  });
});
