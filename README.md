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
- `POST /api/turmas/:turmaId/alunos` (MR-47, cria vínculo em `alunos_turmas`)
- `DELETE /api/turmas/:turmaId/alunos/:alunoId` (MR-47, marca vínculo como removido)
- `POST /api/envios-desafios` (MR-47, persiste participantes em `participantes_envio` para envios em grupo)
- `PUT /api/envios-desafios/:id/participantes` (MR-47, substitui participantes ativos do envio)
- `PATCH /api/admin/envios-desafios/:id/avaliacao` (MR-47, pontua usando `participantes_envio`)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-47 implementadas

- Matrículas de alunos em turmas são gravadas na coleção `alunos_turmas`
- Remoções de alunos de turmas atualizam o vínculo para `removida`, preservando histórico
- Envios em grupo gravam participantes na coleção `participantes_envio`
- Alterações de participantes removem vínculos ativos anteriores e criam os novos participantes ativos
- Aprovação de envio em grupo busca participantes ativos em `participantes_envio` para gerar pontuação
- Arrays legados (`User.turmas`, `Turma.alunos`, `EnvioDesafio.participantes`) são mantidos por compatibilidade durante a transição
- Índices únicos parciais evitam matrícula ativa duplicada e participante ativo duplicado no mesmo envio
- O limite máximo de participantes definido no desafio é preservado

## Coleções adicionadas

`alunos_turmas`

- `aluno`
- `turma`
- `status`
- `removedAt`
- `createdAt`
- `updatedAt`

`participantes_envio`

- `envio`
- `aluno`
- `status`
- `removedAt`
- `createdAt`
- `updatedAt`

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
