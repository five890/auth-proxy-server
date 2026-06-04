import http from 'http';
import net from 'net';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url ));

// Configuração
const PORT_10050 = process.env.PORT_10050 || 10050;
const PORT_10065 = process.env.PORT_10065 || 10065;
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Configuração de redirecionamento por porta
const TARGET_CONFIG = {
  [PORT_10050]: { host: '93.127.128.4', port: 10050 },
  [PORT_10065]: { host: '69.197.176.242', port: 10065 },
};

// Middleware para logar requisições
const logRequest = (req, res, next ) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`  Client IP: ${clientIp}`);
  
  // Adicionar headers de proxy
  req.headers['x-forwarded-for'] = clientIp;
  req.headers['x-forwarded-proto'] = 'http';
  
  next( );
};

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

// Função para criar servidor TCP com redirecionamento
const createTCPProxy = (listenPort, targetHost, targetPort) => {
  const server = net.createServer((clientSocket) => {
    const clientIp = clientSocket.remoteAddress;
    console.log(`[${new Date().toISOString()}] TCP Connection from ${clientIp}:${clientSocket.remotePort}`);

    // Conectar ao servidor de destino
    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      console.log(`  Connected to ${targetHost}:${targetPort}`);
    });

    // Redirecionar dados do cliente para o servidor
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    // Tratamento de erros
    clientSocket.on('error', (err) => {
      console.error(`Client error: ${err.message}`);
      targetSocket.destroy();
    });

    targetSocket.on('error', (err) => {
      console.error(`Target error: ${err.message}`);
      clientSocket.destroy();
    });

    // Fechar conexão
    clientSocket.on('end', () => {
      console.log(`  Client disconnected from ${clientIp}`);
      targetSocket.end();
    });

    targetSocket.on('end', () => {
      console.log(`  Target disconnected`);
      clientSocket.end();
    });
  });

  server.listen(listenPort, '0.0.0.0', () => {
    console.log(`✓ TCP Proxy listening on port ${listenPort} → ${targetHost}:${targetPort}`);
  });

  return server;
};

// Criar servidor HTTP para health check e validação
const httpServer = app.listen(3000, '0.0.0.0', ( ) => {
  console.log('✓ HTTP server listening on port 3000 for health checks');
});

// Criar servidores TCP para proxy
const server10050 = createTCPProxy(PORT_10050, TARGET_CONFIG[PORT_10050].host, TARGET_CONFIG[PORT_10050].port);
const server10065 = createTCPProxy(PORT_10065, TARGET_CONFIG[PORT_10065].host, TARGET_CONFIG[PORT_10065].port);

// Tratamento de sinais
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server10050.close(() => console.log('Server 10050 closed'));
  server10065.close(() => console.log('Server 10065 closed'));
  httpServer.close(( ) => console.log('HTTP server closed'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server10050.close(() => console.log('Server 10050 closed'));
  server10065.close(() => console.log('Server 10065 closed'));
  httpServer.close(( ) => console.log('HTTP server closed'));
  process.exit(0);
});

console.log('AUTH PROXY Server started - TCP Proxy Mode');
console.log(`API URL: ${API_URL}`);
console.log(`Ports: ${PORT_10050} → ${TARGET_CONFIG[PORT_10050].host}:${TARGET_CONFIG[PORT_10050].port}`);
console.log(`Ports: ${PORT_10065} → ${TARGET_CONFIG[PORT_10065].host}:${TARGET_CONFIG[PORT_10065].port}`);
