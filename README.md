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
- `GET /api/configuracoes` (requer JWT de professor/admin)
- `GET /api/grupos/meus` (requer JWT de aluno)
- `GET /api/docs` (Swagger UI)

## Configurações iniciais

O endpoint `GET /api/configuracoes` expõe parâmetros funcionais seguros da aplicação em modo somente leitura, como visibilidade do ranking geral para alunos, modelo de pontuação fixa por desafio e recursos planejados ainda indisponíveis no MVP. A rota é protegida por JWT e restrita aos perfis `professor` e `admin`.

As respostas de autenticação incluem `role` e `status` do usuário para permitir que a Web filtre menus e rotas conforme os perfis definidos nas regras de negócio.

## Meus grupos do aluno

O endpoint `GET /api/grupos/meus` permite que o aluno autenticado consulte apenas os desafios em grupo em que ele é responsável ou participante. A resposta traz desafio, pilar, responsável, participantes, status e pontos concedidos somente quando o envio está aprovado.

## Web

A aplicação Web fica em `web/` e consome a API REST por `NEXT_PUBLIC_API_BASE_URL`. A tela administrativa `/configuracoes` usa apenas `GET /api/configuracoes`, exibe os parâmetros retornados em modo somente leitura e mostra estado vazio quando a API não retornar configurações disponíveis.

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
