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

## Endpoints iniciais

- `GET /api/health`
- `GET /api/health/protected` (requer JWT)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/heuristicas` (MR-3, requer JWT)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-3 implementadas

- Apenas usuários autenticados podem cadastrar heurística
- Campos obrigatórios: `title` e `description`
- Título único por usuário autor
- Persistência de metadados mínimos de autoria (`authorId`, `authorEmail`) e criação (`createdAt`)
- Validação executada antes da persistência

## Testes unitários

```bash
npm test
```

Cobertura adicionada para cadastro de heurística:
- sucesso com payload válido
- rejeição quando faltam campos obrigatórios
- rejeição quando há título duplicado para o mesmo autor

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Adicionar testes automatizados
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
