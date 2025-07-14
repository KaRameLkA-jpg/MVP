export const routes = [
  // Чаты
  'POST   /api/chats',                    // Создать новый чат
  'GET    /api/chats/:id',                // Получить чат с сообщениями
  'POST   /api/chats/:id/messages',       // Отправить сообщение
  'GET    /api/chats/:id/stream',         // SSE для уведомлений

  // Анализ
  'POST   /api/analysis/:sessionId',      // Запустить анализ
  'GET    /api/analysis/:id',             // Получить результат анализа
  
  // Память
  'POST   /api/memory',                   // Сохранить в память
  'GET    /api/memory',                   // Получить память пользователя
  'GET    /api/memory/search',            // Поиск по памяти

  // Мета
  'GET    /api/assistants',               // Список доступных ассистентов
  'GET    /api/user/stats'                // Статистика пользователя
]