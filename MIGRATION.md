# 🚀 Migrasi Express.js → Fastify

## Ringkasan Perubahan

| Aspek | Express.js (Lama) | Fastify (Baru) |
|---|---|---|
| Framework | `express ^4.19` | `fastify ^4.28` |
| CORS | `cors` package | `@fastify/cors` |
| Static Files | `express.static()` | `@fastify/static` |
| Body Parser | `express.json()` + `express.urlencoded()` | Built-in di Fastify |
| Middleware | `app.use()` | `fastify.addHook()` |
| Error Handler | `app.use(err, req, res, next)` | `fastify.setErrorHandler()` |
| 404 Handler | `app.use((req, res) => ...)` | `fastify.setNotFoundHandler()` |
| JSON Spacing | `app.set('json spaces', 2)` | Dihandle di `onSend` hook |

## Arsitektur Baru

```
fastify-api/
├── index.js            ← Entry point (Fastify)
├── function.js         ← Helper globals (tidak berubah)
├── express-compat.js   ← Adapter: route lama tetap kompatibel
├── package.json        ← Dependencies baru (Fastify)
├── vercel.json
├── api-page/           ← Frontend (tidak berubah)
├── fonts/              ← Tidak berubah
└── src/
    ├── settings.json   ← Tidak berubah
    └── api/            ← Semua route TIDAK perlu diubah
        ├── ai/
        ├── api/
        ├── download/
        ├── gateway/
        ├── imagecreator/
        ├── orderkuota/
        ├── random/
        ├── search/
        ├── stalk/
        └── tools/
```

## File Kunci: `express-compat.js`

File ini adalah "jembatan" antara route lama (Express-style) dan Fastify.
Semua file route yang menggunakan pola berikut **tidak perlu diubah sama sekali**:

```js
// Pola lama — tetap bekerja di Fastify
module.exports = function(app) {
  app.get('/endpoint', async (req, res) => {
    res.json({ status: true, result: '...' });
  });
};
```

Adapter memetakan:
- `req.query`, `req.params`, `req.body`, `req.headers`, `req.hostname` → Fastify request
- `res.status()`, `res.json()`, `res.send()`, `res.sendFile()` → Fastify reply

## Cara Install & Jalankan

```bash
# Install dependencies
npm install

# Jalankan server
npm start

# Mode development (auto-reload)
npm run dev
```

## Keunggulan Fastify vs Express

- **Performa ~65% lebih cepat** (benchmark: 30k req/s vs 18k req/s)
- **Validasi JSON Schema** bawaan (bisa ditambahkan per-route)
- **TypeScript support** lebih baik
- **Serialisasi JSON lebih cepat** (fast-json-stringify)
- **Plugin system** yang lebih terstruktur
- **Hook system** yang lebih powerful dari middleware Express

## Menambahkan Route Baru (Native Fastify)

Untuk route baru, disarankan menggunakan style Fastify native:

```js
module.exports = function(app) {
  // Gunakan app._fastify untuk akses fastify native
  const fastify = app._fastify;

  fastify.get('/endpoint-baru', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          url: { type: 'string' }
        },
        required: ['url']
      }
    }
  }, async (request, reply) => {
    const { url } = request.query;
    return reply.send({ status: true, result: url });
  });
};
```
