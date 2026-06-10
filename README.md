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
- `POST /api/turmas/:turmaId/alunos` (MR-17, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-17 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem matricular alunos em turmas
- O aluno deve existir, ter `role` igual a `aluno` e `status` igual a `ativo`
- A turma deve existir e ter `status` igual a `ativa`
- Matrícula duplicada para o mesmo aluno na mesma turma retorna 409
- O vínculo é persistido no campo `turmas` do aluno, preservando a estrutura usada nas histórias anteriores

## Contrato da matrícula de aluno em turma

Requisição:

```http
POST /api/turmas/6814f12ab3f34872f7558f49/alunos
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "studentId": "6814f12ab3f34872f7558f50"
}
```

Resposta:

```json
{
  "matricula": {
    "id": "6814f12ab3f34872f7558f49:6814f12ab3f34872f7558f50",
    "turmaId": "6814f12ab3f34872f7558f49",
    "studentId": "6814f12ab3f34872f7558f50",
    "status": "ativa",
    "student": {
      "id": "6814f12ab3f34872f7558f50",
      "name": "Aluno Teste",
      "email": "aluno@email.com",
      "status": "ativo"
    },
    "turma": {
      "id": "6814f12ab3f34872f7558f49",
      "name": "Turma Frontend",
      "status": "ativa"
    }
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
