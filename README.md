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
- `GET /api/turmas` (MR-13, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-13 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem listar turmas
- A listagem retorna resposta paginada com `page`, `limit`, `total` e `totalPages`
- O filtro opcional `status` retorna apenas turmas compatíveis
- Totais básicos são retornados no campo `totals` quando estiverem disponíveis na turma
- `page` e `limit` devem ser inteiros positivos, e `limit` é limitado a 100 itens por página

## Contrato da listagem de turmas

Requisição:

```http
GET /api/turmas?page=1&limit=10&status=ativa
Authorization: Bearer <token>
```

Resposta:

```json
{
  "turmas": [
    {
      "id": "6814f12ab3f34872f7558f49",
      "name": "Turma Frontend",
      "status": "ativa",
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2026-08-01T00:00:00.000Z",
      "totals": {
        "students": 24,
        "activeStudents": 22
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
