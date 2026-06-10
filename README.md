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
- `GET /api/turmas/:id` (MR-14, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-14 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem visualizar turmas
- A consulta retorna `id`, `name`, `startDate`, `endDate`, `status` e `studentCount`
- `studentCount` contabiliza usuários com `role` aluno vinculados à turma pelo campo `turmas`
- Turma inexistente ou id inválido retorna 404

## Contrato da visualização de turma

Requisição:

```http
GET /api/turmas/6814f12ab3f34872f7558f49
Authorization: Bearer <token>
```

Resposta:

```json
{
  "turma": {
    "id": "6814f12ab3f34872f7558f49",
    "name": "Turma Frontend",
    "status": "ativa",
    "studentCount": 24,
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-08-01T00:00:00.000Z"
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
