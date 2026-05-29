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
- `GET /api/alunos/:id` (MR-9, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-9 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem visualizar detalhes de alunos
- A consulta retorna 404 quando o aluno não existe
- A resposta inclui dados cadastrais, turmas vinculadas e `pointsSummary` quando disponível
- A resposta nunca retorna `password` nem `passwordHash`

## Contrato da visualização de aluno

```json
{
  "student": {
    "id": "6814f12ab3f34872f7558f50",
    "name": "Maria Silva",
    "email": "maria@email.com",
    "role": "aluno",
    "status": "ativo",
    "turmas": [
      {
        "id": "6814f12ab3f34872f7558f49",
        "name": "Turma Frontend"
      }
    ],
    "pointsSummary": {
      "total": 120,
      "available": 90
    }
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
