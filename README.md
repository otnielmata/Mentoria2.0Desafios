# Mentoria API - Estrutura Inicial

Estrutura inicial de uma API REST construída com JavaScript, Express, autenticação JWT e MongoDB, organizada em camadas para facilitar evolução por user stories.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Swagger (`swagger-ui-express` + `yamljs`)
- Jest

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
- `POST /api/pilares` (MR-19, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-19 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem cadastrar pilares
- O campo `name` é obrigatório
- O campo `description` é opcional
- O status inicial do pilar é `ativo`
- O nome é normalizado para impedir duplicidade entre pilares ativos
- Pilares inativos podem ser reaproveitados por histórias futuras sem bloquear um novo pilar ativo de mesmo nome

## Contrato do cadastro de pilar

Requisição:

```http
POST /api/pilares
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "Clareza",
  "description": "Pilar do Método do Alavanque"
}
```

Resposta:

```json
{
  "pilar": {
    "id": "6814f12ab3f34872f7558f49",
    "name": "Clareza",
    "description": "Pilar do Método do Alavanque",
    "status": "ativo"
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
