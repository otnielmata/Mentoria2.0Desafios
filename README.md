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
- `POST /api/usuarios/login` (MR-2)
- `POST /api/auth/login`
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-2 implementadas

- Login por e-mail e senha em `POST /api/usuarios/login`
- Mensagem genérica em falha de autenticação (sem revelar se falhou e-mail ou senha)
- Apenas usuário com `status: active` pode autenticar
- Tentativas inválidas persistidas para auditoria básica
- Token JWT retornado com expiração configurada por `JWT_EXPIRES_IN`

## Testes unitários

```bash
npm test
```

Cobertura adicionada para login:
- sucesso com credenciais válidas
- senha incorreta
- usuário inexistente
- usuário inativo

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Adicionar testes automatizados
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
