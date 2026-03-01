/**
 * express-compat.js
 * ------------------
 * Thin adapter agar semua route file lama (Express-style) bisa langsung
 * dipakai di Fastify tanpa perlu diubah satu per satu.
 *
 * Cara kerja:
 *   require('./express-compat')(fastify)  → mengembalikan objek `app` tiruan
 *   yang meneruskan app.get / app.post / dll. ke fastify.route()
 */

'use strict';

module.exports = function createExpressCompat(fastify) {
  function makeHandler(method) {
    return function (path, handler) {
      fastify.route({
        method: method.toUpperCase(),
        url: path,
        handler: async (request, reply) => {
          // Buat req & res tiruan yang kompatibel dengan Express
          const req = buildReq(request);
          const res = buildRes(reply);
          try {
            await handler(req, res);
          } catch (err) {
            reply.status(500).send({ status: false, error: err.message });
          }
        },
      });
    };
  }

  const app = {
    get: makeHandler('GET'),
    post: makeHandler('POST'),
    put: makeHandler('PUT'),
    patch: makeHandler('PATCH'),
    delete: makeHandler('DELETE'),
    use: () => {}, // middleware Express diabaikan (sudah dihandle Fastify)
    _fastify: fastify, // akses langsung bila perlu
  };

  return app;
};

// ─── Helper: buat objek req kompatibel Express ────────────────────────────────
function buildReq(request) {
  return {
    query: request.query || {},
    params: request.params || {},
    body: request.body || {},
    headers: request.headers || {},
    hostname: request.hostname || request.headers?.host?.split(':')[0] || '',
    path: request.url,
    ip: request.ip,
    method: request.method,
    // alias
    get: (header) => request.headers?.[header.toLowerCase()],
  };
}

// ─── Helper: buat objek res kompatibel Express ────────────────────────────────
function buildRes(reply) {
  const res = {
    _statusCode: 200,
    _headers: {},

    status(code) {
      reply.status(code);
      res._statusCode = code;
      return res;
    },

    json(data) {
      reply.header('content-type', 'application/json');
      reply.send(data);
      return res;
    },

    send(data) {
      reply.send(data);
      return res;
    },

    sendFile(filePath) {
      const path = require('path');
      const fs = require('fs');
      // Coba kirim dari api-page folder
      const abs = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), 'api-page', filePath);
      if (fs.existsSync(abs)) {
        const stream = fs.createReadStream(abs);
        reply.type('text/html').send(stream);
      } else {
        reply.status(404).send('File not found');
      }
      return res;
    },

    setHeader(key, value) {
      reply.header(key, value);
      _headers[key] = value;
      return res;
    },

    header(key, value) {
      reply.header(key, value);
      return res;
    },

    type(contentType) {
      reply.type(contentType);
      return res;
    },

    redirect(url) {
      reply.redirect(url);
      return res;
    },

    end(data) {
      reply.send(data || '');
      return res;
    },
  };

  return res;
}
