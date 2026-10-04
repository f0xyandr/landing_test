const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const Datastore = require('@seald-io/nedb');
const path = require('node:path');
const fs = require('node:fs/promises');

async function createApp({ dataDir = path.resolve(__dirname, '../data'), distDir = path.resolve(__dirname, '../dist'), limit = 15 } = {}) {
  await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
  const filename = path.join(dataDir, 'registrations.db');
  const db = new Datastore({ filename });
  await db.loadDatabaseAsync();
  await db.ensureIndexAsync({ fieldName: 'phone', unique: true });
  await fs.chmod(filename, 0o600);

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'font-src': ["'self'"],
        'frame-src': ["'none'"],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
  }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/admin/registrations', async (req, res, next) => {
    try {
      const pageValue = req.query.page === undefined ? '1' : req.query.page;
      if (typeof pageValue !== 'string' || !/^[1-9]\d{0,5}$/.test(pageValue)) return res.status(400).json({ error: 'Некорректный номер страницы.' });
      const page = Number(pageValue);
      const pageSize = 50;
      const total = await db.countAsync({});
      const items = await db.findAsync({}).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize);
      res.json({ items, total, page, pageSize });
    } catch (error) { next(error); }
  });
  app.post('/api/registrations',
    rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' } }),
    express.json({ limit: '8kb' }),
    async (req, res, next) => {
      try {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Некорректный формат заявки.' });
        if (body.website) return res.status(400).json({ error: 'Не удалось обработать заявку.' });
        const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
        const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
        let digits = rawPhone.replace(/\D/g, '');
        if (digits.length === 11 && digits[0] === '8') digits = `7${digits.slice(1)}`;
        if (digits.length === 10) digits = `7${digits}`;
        const phone = `+${digits}`;
        if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{M} '\-]+$/u.test(name)) return res.status(400).json({ error: 'Введите имя: от 2 до 80 букв.', field: 'name' });
        if (rawPhone.length > 32 || !/^[+\d\s()\-]+$/.test(rawPhone) || !/^[1-9]\d{9,14}$/.test(digits)) return res.status(400).json({ error: 'Введите корректный номер телефона.', field: 'phone' });
        if (body.consent !== true) return res.status(400).json({ error: 'Нужно согласие на обработку персональных данных.', field: 'consent' });
        const allowedMessengers = ['phone', 'telegram', 'whatsapp'];
        const messenger = body.messenger === undefined ? 'phone' : body.messenger;
        if (!allowedMessengers.includes(messenger)) return res.status(400).json({ error: 'Выберите доступный способ связи.', field: 'messenger' });
        try {
          await db.insertAsync({ name, phone, messenger, consent: true, consentVersion: '1', createdAt: new Date() });
        } catch (error) {
          if (error.errorType !== 'uniqueViolated') throw error;
        }
        return res.status(201).json({ message: 'Заявка принята. Спасибо за интерес к мероприятию!' });
      } catch (error) { next(error); }
    });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Маршрут не найден.' }));
  app.get('/admin', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(distDir, 'admin.html'));
  });
  app.use(express.static(distDir, { index: 'index.html' }));
  app.use((_req, res) => res.status(404).send('Страница не найдена'));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Заявка слишком большая.' });
    console.error('Request failed:', error.code || error.name);
    res.status(500).json({ error: 'Не удалось сохранить заявку. Попробуйте ещё раз позже.' });
  });
  return { app, db };
}

module.exports = { createApp };
