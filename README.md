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
- `GET /api/alunos` (MR-8, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-8 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem listar alunos
- A listagem retorna apenas usuários com `role` aluno
- A resposta é paginada com `page`, `limit`, `total` e `totalPages`
- Os filtros aceitos são `turmaId`, `status` e `search`
- Cada item da lista nunca retorna `password` nem `passwordHash`

## Contrato da listagem de alunos

Exemplo de requisição:

```text
GET /api/alunos?page=1&limit=10&status=ativo&turmaId=6814f12ab3f34872f7558f49&search=maria
```

Resposta:

```json
{
  "students": [
    {
      "id": "6814f12ab3f34872f7558f50",
      "name": "Maria Silva",
      "email": "maria@email.com",
      "role": "aluno",
      "status": "ativo",
      "turmas": ["6814f12ab3f34872f7558f49"]
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
