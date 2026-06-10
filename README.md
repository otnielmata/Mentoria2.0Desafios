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
- `GET /api/pilares` (MR-20, requer JWT)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-20 implementadas

- Todos os usuários autenticados podem listar pilares
- Alunos recebem apenas pilares com `status` igual a `ativo`
- Professor e admin podem filtrar por `status`
- Sem filtro, a listagem retorna pilares ativos por padrão
- A resposta inclui dados suficientes para seleção ou consulta da categoria dos desafios

## Contrato da listagem de pilares

Requisição:

```http
GET /api/pilares?status=ativo
Authorization: Bearer <token>
```

Resposta:

```json
{
  "pilares": [
    {
      "id": "6814f12ab3f34872f7558f49",
      "name": "Clareza",
      "description": "Pilar do Método do Alavanque",
      "status": "ativo"
    }
  ]
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
