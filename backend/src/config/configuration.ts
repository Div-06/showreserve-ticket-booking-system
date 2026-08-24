export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ticket_booking?schema=public',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_key_123456789',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_987654321',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  hold: {
    ttlSeconds: parseInt(process.env.HOLD_TTL_SECONDS, 10) || 600,
  },
  waitlist: {
    offerTtlSeconds: parseInt(process.env.WAITLIST_OFFER_TTL_SECONDS, 10) || 900,
  },
  mail: {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT, 10) || 2525,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || '"ShowReserve" <no-reply@showreserve.com>',
  },
  qr: {
    secret: process.env.QR_SECRET || 'qr_signing_secret_key_9999',
  },
});
