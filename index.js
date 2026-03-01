'use strict';

const fastify = require('fastify')({
  logger: false,
  trustProxy: true,
});

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const createExpressCompat = require('./express-compat');

require('./function.js');

// ─── Plugin Setup ──────────────────────────────────────────────────────────────
fastify.register(require('@fastify/cors'), { origin: '*' });

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'api-page'),
  prefix: '/',
  decorateReply: false,
});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'src'),
  prefix: '/src/',
  decorateReply: false,
});

// ─── Settings ──────────────────────────────────────────────────────────────────
const settingsPath = path.join(__dirname, './src/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
global.apikey = settings.apiSettings.apikey;

// ─── Global Hook: Request Logger ──────────────────────────────────────────────
fastify.addHook('onRequest', async (request) => {
  console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Request Route: ${request.url} `));
  global.totalreq += 1;
});

// ─── Global Hook: Response Wrapper (tambah field creator) ─────────────────────
fastify.addHook('onSend', async (request, reply, payload) => {
  const contentType = reply.getHeader('content-type') || '';
  if (!contentType.includes('application/json')) return payload;

  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const wrapped = {
        status: data.status,
        creator: settings.apiSettings.creator || 'Created Using Deoberon',
        ...data,
      };
      return JSON.stringify(wrapped, null, 2);
    }
  } catch (_) {}
  return payload;
});

// ─── Auto-load Routes (kompatibel Express-style) ──────────────────────────────
// Buat adapter `app` yang mendaftarkan semua route ke fastify
const app = createExpressCompat(fastify);

let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');

fs.readdirSync(apiFolder).forEach((subfolder) => {
  const subfolderPath = path.join(apiFolder, subfolder);
  if (fs.statSync(subfolderPath).isDirectory()) {
    fs.readdirSync(subfolderPath).forEach((file) => {
      const filePath = path.join(subfolderPath, file);
      if (path.extname(file) === '.js') {
        try {
          require(filePath)(app);
          totalRoutes++;
          console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${path.basename(file)} `));
        } catch (err) {
          console.error(chalk.red(` Failed to load: ${file} — ${err.message} `));
        }
      }
    });
  }
});

fastify._totalRoutes = totalRoutes;
console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

// ─── Root Route ────────────────────────────────────────────────────────────────
fastify.get('/', (request, reply) => {
  return reply.sendFile('index.html');
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).sendFile('404.html');
});

// ─── Error Handler ────────────────────────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  console.error(error.stack);
  reply.status(500).sendFile('500.html');
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Server is running on port ${PORT} `));
});

module.exports = fastify;
