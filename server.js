import http from 'http';
import https from 'https';
import httpProxy from 'http-proxy';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url ));

// Configuração
const PORT_10050 = process.env.PORT_10050 || 10050;
const PORT_10065 = process.env.PORT_10065 || 10065;
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Criar proxy
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  timeout: 30000,
  proxyTimeout: 30000,
} );

// Middleware para logar requisições
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`  Client IP: ${clientIp}`);
  
  // Adicionar headers de proxy
  req.headers['x-forwarded-for'] = clientIp;
  req.headers['x-forwarded-proto'] = 'http';
  
  next( );
};

// Tratamento de erros do proxy
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`  Response: ${proxyRes.statusCode}`);
});

// Criar aplicação Express
const app = express();

// Middleware
app.use(logRequest);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    ports: [PORT_10050, PORT_10065],
    api_url: API_URL,
    timestamp: new Date().toISOString(),
  });
});

// Rota para validar key
app.post('/api/validate-key', express.json(), async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Key required' });
    }

    // Chamar API de validação
    const response = await fetch(`${API_URL}/api/trpc/publicApi.updateIp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para todas as outras requisições
app.all('*', (req, res) => {
  const targetUrl = process.env.TARGET_URL || 'http://example.com';
  
  console.log(`Proxying to: ${targetUrl}${req.url}` );
  
  proxy.web(req, res, { target: targetUrl });
});

// Criar servidor HTTP na porta 10050
const server10050 = http.createServer(app );
server10050.listen(PORT_10050, '0.0.0.0', () => {
  console.log(`✓ Proxy server listening on port ${PORT_10050}`);
});

// Criar servidor HTTP na porta 10065
const server10065 = http.createServer(app );
server10065.listen(PORT_10065, '0.0.0.0', () => {
  console.log(`✓ Proxy server listening on port ${PORT_10065}`);
});

// Tratamento de sinais
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server10050.close(() => console.log('Server 10050 closed'));
  server10065.close(() => console.log('Server 10065 closed'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server10050.close(() => console.log('Server 10050 closed'));
  server10065.close(() => console.log('Server 10065 closed'));
  process.exit(0);
});

console.log('AUTH PROXY Server started');
console.log(`API URL: ${API_URL}`);
console.log(`Ports: ${PORT_10050}, ${PORT_10065}`);
