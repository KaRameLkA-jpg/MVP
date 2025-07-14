import jwt from 'jsonwebtoken'

export class AuthMiddleware {
  static async authenticate(request, reply) {
    try {
      // Получаем токен из заголовка Authorization
      const authHeader = request.headers.authorization
      
      if (!authHeader) {
        return reply.code(401).send({ 
          error: 'Отсутствует токен аутентификации',
          code: 'MISSING_AUTH_TOKEN'
        })
      }

      // Проверяем формат Bearer TOKEN
      const tokenParts = authHeader.split(' ')
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return reply.code(401).send({ 
          error: 'Неверный формат токена аутентификации',
          code: 'INVALID_TOKEN_FORMAT'
        })
      }

      const token = tokenParts[1]
      
      // Валидируем JWT секрет
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret || jwtSecret === 'REPLACE_WITH_SECURE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS') {
        console.error('КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET не настроен или использует демо-значение!')
        return reply.code(500).send({ 
          error: 'Ошибка конфигурации сервера',
          code: 'SERVER_CONFIG_ERROR'
        })
      }

      // Верифицируем JWT токен
      const decoded = jwt.verify(token, jwtSecret)
      
      // Добавляем информацию о пользователе в request
      request.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp
      }

    } catch (error) {
      console.error('Ошибка аутентификации:', error.message)
      
      if (error.name === 'TokenExpiredError') {
        return reply.code(401).send({ 
          error: 'Токен аутентификации истёк',
          code: 'TOKEN_EXPIRED'
        })
      }
      
      if (error.name === 'JsonWebTokenError') {
        return reply.code(401).send({ 
          error: 'Недействительный токен аутентификации',
          code: 'INVALID_TOKEN'
        })
      }
      
      return reply.code(401).send({ 
        error: 'Ошибка аутентификации',
        code: 'AUTH_ERROR'
      })
    }
  }

  static generateToken(user) {
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret || jwtSecret === 'REPLACE_WITH_SECURE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS') {
      throw new Error('JWT_SECRET не настроен правильно')
    }

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      jwtSecret,
      { 
        expiresIn: '24h',
        issuer: 'mindful-ai',
        audience: 'mindful-ai-users'
      }
    )
  }

  static async optionalAuth(request, reply) {
    try {
      const authHeader = request.headers.authorization
      
      if (!authHeader) {
        // Если токена нет, устанавливаем гостевого пользователя
        request.user = {
          id: 'guest-user',
          email: 'guest@mindful-ai.com',
          name: 'Гостевой пользователь',
          isGuest: true
        }
        return
      }

      // Пытаемся аутентифицировать
      await AuthMiddleware.authenticate(request, reply)
    } catch (error) {
      // При ошибке аутентификации устанавливаем гостевого пользователя
      request.user = {
        id: 'guest-user',
        email: 'guest@mindful-ai.com',
        name: 'Гостевой пользователь',
        isGuest: true
      }
    }
  }
}