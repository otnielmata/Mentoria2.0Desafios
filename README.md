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
- `GET /api/me` (MR-5, requer JWT)
- `PATCH /api/me` (MR-6, requer JWT)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-5 implementadas

- Apenas usuários autenticados podem consultar o próprio perfil
- A resposta retorna `id`, `name`, `email`, `role` e `status`
- `turmas` é retornado quando o usuário possuir vínculos
- As respostas nunca retornam `password` nem `passwordHash`

## Contrato da visualização de perfil

```json
{
  "user": {
    "id": "6814f12ab3f34872f7558f49",
    "name": "Otniel Mata",
    "email": "otniel@email.com",
    "role": "student",
    "status": "active",
    "turmas": ["turma-frontend"]
  }
}
```

## Regras da User Story MR-6 implementadas

- Apenas usuários autenticados podem atualizar o próprio perfil
- Os campos editáveis são `name` e `email`
- O `email` permanece único quando atualizado
- Os campos `role`, `status`, `password` e `passwordHash` são rejeitados
- As respostas nunca retornam `password` nem `passwordHash`

## Contrato da atualização de perfil

Requisição:

```json
{
  "name": "Otniel Mata",
  "email": "otniel@email.com"
}
```

Resposta:

```json
{
  "user": {
    "id": "6814f12ab3f34872f7558f49",
    "name": "Otniel Mata",
    "email": "otniel@email.com",
    "role": "student",
    "status": "active"
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
