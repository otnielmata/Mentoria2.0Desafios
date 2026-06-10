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
- `GET /api/pilares/:id` (MR-21, requer JWT)
- `GET /api/docs` (Swagger UI)

## Regras da User Story MR-21 implementadas

- Todos os usuários autenticados podem visualizar pilares acessíveis
- Alunos só podem visualizar pilares ativos
- Professor e admin podem visualizar pilares independentemente do status
- A API retorna 404 quando o pilar não existe, quando o identificador é inválido ou quando o aluno tenta acessar pilar inativo
- A resposta inclui os dados do pilar, sua descrição e a lista de desafios associados

## Contrato da visualização de pilar

Requisição:

```http
GET /api/pilares/6814f12ab3f34872f7558f49
Authorization: Bearer <token>
```

Resposta:

```json
{
  "pilar": {
    "id": "6814f12ab3f34872f7558f49",
    "name": "Clareza",
    "description": "Pilar do Método do Alavanque",
    "status": "ativo",
    "desafios": [
      {
        "id": "6814f12ab3f34872f7558f50",
        "title": "Diagnosticar ponto de partida",
        "description": "Mapear o estado atual antes da execução.",
        "status": "ativo"
      }
    ]
  }
}
```

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Ampliar testes automatizados conforme novas regras de negócio
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
