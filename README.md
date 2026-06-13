# Mentoria 2.0 Desafios

Estrutura inicial de uma API REST construída com JavaScript, Express, autenticação JWT e MongoDB, com uma aplicação web inicial em Next.js para consumir os endpoints do backend.

## Stack da API

- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Swagger (`swagger-ui-express` + `yamljs`)

## Stack da Web

- Next.js
- React
- JavaScript
- Tema claro/escuro
- Cliente HTTP conectado a API REST

## Arquitetura de pastas da API

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

## Arquitetura de pastas da Web

```text
web/
  src/
    app/             # Views e rotas do Next.js
    components/      # Componentes visuais reutilizaveis
    config/          # Ambiente, rotas e tema
    controllers/     # Orquestracao das acoes das telas
    models/          # Validacoes e contratos de entrada
    services/        # Integracao com API REST e sessao local
```

A aplicação web usa App Router do Next.js, JavaScript com alias `@/` via `jsconfig.json`, rotas públicas/protegidas em `web/src/config/routes.js` e tema claro/escuro centralizado em `web/src/config/theme.js`.

## Configuração de ambiente

### API

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

### Web

1. Copie o exemplo:

```bash
cp web/.env.example web/.env.local
```

2. Ajuste a URL da API:

- `NEXT_PUBLIC_API_BASE_URL`

## Instalação da API

```bash
npm install
```

## Instalação da Web

```bash
cd web
npm install
```

## Scripts da API

- `npm run dev`: inicia com `nodemon` e reinicia automaticamente a cada alteração
- `npm start`: inicia em modo estático

## Scripts da Web

Execute dentro da pasta `web/`:

- `npm run dev`: inicia a aplicação web em desenvolvimento e reinicia a cada alteração
- `npm start`: inicia a aplicação web em modo estático/producao depois do build
- `npm run build`: gera a versão de produção
- `npm test`: executa os testes unitários da aplicação web

## Endpoints iniciais

- `GET /api/health`
- `GET /api/health/protected` (requer JWT)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/docs` (Swagger UI)

## Telas iniciais da Web

- Inicio
- Login
- Registrar usuario
- Dashboard
- Heuristicas

## Integração Web + API

A aplicação web não acessa o MongoDB diretamente. O MongoDB, a autenticação JWT e as regras de negócio continuam centralizados na API REST. A web consome os endpoints por meio da variável `NEXT_PUBLIC_API_BASE_URL` e armazena o token JWT localmente para chamadas autenticadas.

O cliente HTTP da web usa somente `NEXT_PUBLIC_API_BASE_URL` para montar a URL da API REST; sem essa variável, a aplicação retorna uma falha de configuração em vez de depender de URL fixa no código.

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Adicionar testes automatizados
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
