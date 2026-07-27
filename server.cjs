const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 4173
const DIST = path.join(__dirname, 'dist')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
}

http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url.split('?')[0])
  const ext = path.extname(filePath)

  // SPA fallback
  if (!ext || ext === '') filePath = path.join(DIST, 'index.html')

  const mime = mimeTypes[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (ext) {
        res.writeHead(404)
        res.end('Not Found')
      } else {
        // SPA fallback
        fs.readFile(path.join(DIST, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(500); res.end('Error'); return }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(d2)
        })
      }
      return
    }
    res.writeHead(200, { 'Content-Type': mime })
    res.end(data)
  })
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
