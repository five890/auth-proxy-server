# AUTH PROXY Server

Servidor proxy HTTP/HTTPS para redirecionamento de tráfego do AUTH PROXY.

## Características

- ✅ Suporte a múltiplas portas (10050, 10065 )
- ✅ Redirecionamento de tráfego transparente
- ✅ Validação de keys
- ✅ Logging de requisições
- ✅ Health checks
- ✅ Fácil deploy no Railway

## Instalação Local

\`\`\`bash
npm install
npm start
\`\`\`

## Deploy no Railway

### 1. Conectar ao Railway

\`\`\`bash
npm i -g @railway/cli
railway login
railway init
railway up
\`\`\`

### 2. Configurar variáveis de ambiente

\`\`\`
API_URL=https://seu-dominio.manus.space
TARGET_URL=http://seu-alvo.com
PORT_10050=10050
PORT_10065=10065
\`\`\`

## Endpoints

### Health Check
\`\`\`
GET /health
\`\`\`

### Status
\`\`\`
GET /status
\`\`\`

### Validar Key
\`\`\`
POST /api/validate-key
Content-Type: application/json

{
  "key": "proxyff-7days-abc123"
}
\`\`\`

## Variáveis de Ambiente

- \`API_URL\`: URL da API AUTH PROXY
- \`TARGET_URL\`: URL de destino para redirecionamento
- \`PORT_10050\`: Porta do proxy (padrão: 10050 )
- \`PORT_10065\`: Porta do proxy (padrão: 10065)
- \`NODE_ENV\`: Ambiente (development/production)

## Licença

MIT
