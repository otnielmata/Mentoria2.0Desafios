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
- `POST /api/desafios` (MR-48, cadastra desafio com dificuldade e pontuação)
- `GET /api/desafios` (MR-48, lista desafios com dificuldade e pontos)
- `GET /api/desafios/:id` (MR-48, consulta desafio com dificuldade e pontos)
- `PATCH /api/desafios/:id` (MR-48, atualiza dificuldade e/ou pontuação)
- `PATCH /api/admin/envios-desafios/:id/avaliacao` (MR-48, gera pontuação ao aprovar envio)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-48 implementadas

- Admin/professor pode cadastrar desafio com `difficulty`
- Dificuldades aceitas: `facil`, `medio`, `dificil`, `extra`
- Quando `points` não é informado, a pontuação padrão é aplicada pela dificuldade
- Quando `points` é informado explicitamente, a pontuação customizada é preservada
- Ao aprovar um envio, a pontuação gerada usa os pontos calculados do desafio
- Consultas de desafio retornam `difficulty` e `points`

## Pontuação por dificuldade

| Dificuldade | Pontos |
| --- | ---: |
| facil | 10 |
| medio | 20 |
| dificil | 30 |
| extra | 50 |

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
