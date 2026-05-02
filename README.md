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
- `POST /api/usuarios/registro` (MR-1)
- `POST /api/auth/register` (compatibilidade)
- `POST /api/auth/login`
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-1 implementadas

- E-mail único na base de usuários
- Senha persistida com hash
- Campos obrigatórios: nome, e-mail e senha (com validação)
- Usuário criado com status `active` por padrão
- Respostas de erro de validação padronizadas com `code` e `details`

## Testes unitários

```bash
npm test
```

Os testes cobrem o serviço de registro de usuário para:
- sucesso no cadastro
- e-mail duplicado
- payload inválido

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Adicionar testes automatizados
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
