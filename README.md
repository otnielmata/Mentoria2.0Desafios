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
- `POST /api/alunos` (MR-7, requer JWT de professor ou admin)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-7 implementadas

- Apenas usuários autenticados com `role` professor ou admin podem cadastrar alunos
- O aluno é criado com `role` aluno e `status` ativo
- O `email` do aluno deve ser único
- A senha é armazenada como hash
- `turmaId` é opcional e precisa apontar para uma turma existente quando informado
- A resposta nunca retorna `password` nem `passwordHash`

## Contrato do cadastro de aluno

Requisição:

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "123456",
  "turmaId": "6814f12ab3f34872f7558f49"
}
```

Resposta:

```json
{
  "student": {
    "id": "6814f12ab3f34872f7558f50",
    "name": "Maria Silva",
    "email": "maria@email.com",
    "role": "aluno",
    "status": "ativo",
    "turmas": ["6814f12ab3f34872f7558f49"]
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
