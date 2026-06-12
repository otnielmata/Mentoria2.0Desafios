# Mentoria API - Estrutura Inicial

Estrutura inicial de uma API REST construída com JavaScript, Express, autenticação JWT e MongoDB, organizada em camadas para facilitar evolução por user stories.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Swagger (`swagger-ui-express` + `yamljs`)

## Arquitetura de pastas

```text
src/
  config/
  controllers/
  middlewares/
  models/
  routes/
  services/
  app.js
  server.js
docs/
  swagger.yaml
```

## Configuração de ambiente

1. Copie o exemplo:

```bash
cp .env.example .env
```

2. Ajuste as variáveis:

- `NODE_ENV`
- `PORT`
- `BASE_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## Instalação

```bash
npm install
```

## Scripts

- `npm run dev`: inicia com `nodemon` e reinicia automaticamente a cada alteração
- `npm start`: inicia em modo estático
- `npm test`: executa os testes unitários com Jest

## Endpoints iniciais

- `GET /api/health`
- `GET /api/health/protected` (requer JWT)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/pilares` (MR-49, lista os pilares ativos do Método do Alavanque)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-49 implementadas

- Ao conectar no MongoDB, a API executa o seed automático dos pilares padrão
- O seed é idempotente e usa `findOneAndUpdate` com `upsert`
- Os pilares padrão são criados com `status` igual a `ativo`
- O campo `normalizedName` remove acentos, normaliza caixa e compacta espaços para evitar duplicidades
- A coleção `pilares` possui índice único parcial para `normalizedName` + `status` quando ativo
- A listagem `GET /api/pilares` retorna os pilares ativos

## Pilares padrão do Método do Alavanque

- Conhecimento Técnico Alinhado ao Mercado
- Posicionamento e Softskills
- Prática
- Exposição a Problemas
- Compartilhamento
- Networking
- Visibilidade

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
