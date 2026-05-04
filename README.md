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
- `GET /api/heuristicas` (MR-4, requer JWT)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-4 implementadas

- Apenas usuários autenticados podem listar heurísticas
- A resposta retorna uma lista consistente, inclusive quando vazia
- Cada heurística contém `id`, `title`, `description` e `createdAt`
- A listagem retorna somente heurísticas ativas e publicáveis
- A ordenação considera a data de criação, da mais recente para a mais antiga

## Contrato da listagem de heurísticas

```json
[
  {
    "id": "6814f12ab3f34872f7558f49",
    "title": "Visibilidade de status",
    "description": "Informe o usuário sobre o que está acontecendo.",
    "createdAt": "2026-05-04T10:00:00.000Z"
  }
]
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
