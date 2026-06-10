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
- `DELETE /api/turmas/:turmaId/alunos/:alunoId` (MR-18, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-18 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem remover alunos de turmas
- A remoção altera somente o campo `turmas` do aluno
- Submissões, pontuações e demais históricos do aluno permanecem preservados
- Turma ou aluno inexistente retorna 404
- Relação ausente é tratada de forma idempotente: retorna 200 com `removed: false`

## Contrato da remoção de aluno de turma

Requisição:

```http
DELETE /api/turmas/6814f12ab3f34872f7558f49/alunos/6814f12ab3f34872f7558f50
Authorization: Bearer <token>
```

Resposta quando o vínculo existia e foi removido:

```json
{
  "matricula": {
    "id": "6814f12ab3f34872f7558f49:6814f12ab3f34872f7558f50",
    "turmaId": "6814f12ab3f34872f7558f49",
    "studentId": "6814f12ab3f34872f7558f50",
    "status": "removida",
    "removed": true,
    "student": {
      "id": "6814f12ab3f34872f7558f50",
      "name": "Aluno Teste",
      "email": "aluno@email.com"
    },
    "turma": {
      "id": "6814f12ab3f34872f7558f49",
      "name": "Turma Frontend",
      "status": "ativa"
    }
  }
}
```

Quando o vínculo já estava ausente, a API retorna 200 com `status` igual a `ausente` e `removed: false`.

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
