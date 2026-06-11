# Mentoria API - Método do Alavanque

API REST consolidada para controlar desafios executados por alunos no Método do Alavanque, pontuar ações aprovadas e gerar rankings, dashboards e relatórios.

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
- `npm test`: executa testes unitários com Jest

## Endpoints principais

- `GET /api/health`
- `GET /api/health/protected` (requer JWT)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me` e `PATCH /api/me`
- `POST /api/alunos`, `GET /api/alunos`, `GET /api/alunos/:id`
- `POST /api/turmas`, `GET /api/turmas`, `GET /api/turmas/:id`, `PATCH /api/turmas/:id`
- `POST /api/turmas/:turmaId/alunos` e `DELETE /api/turmas/:turmaId/alunos/:alunoId`
- `POST /api/pilares`, `GET /api/pilares`, `GET /api/pilares/:id`, `PATCH /api/pilares/:id`, `DELETE /api/pilares/:id`
- `POST /api/desafios`, `GET /api/desafios`, `GET /api/desafios/:id`, `PATCH /api/desafios/:id`, `DELETE /api/desafios/:id`
- `POST /api/envios-desafios`, `GET /api/me/envios-desafios`, `GET /api/envios-desafios/:id`
- `PATCH /api/envios-desafios/:id`, `PUT /api/envios-desafios/:id/participantes`, `DELETE /api/envios-desafios/:id`
- `GET /api/admin/envios-desafios/pendentes`
- `PATCH /api/admin/envios-desafios/:id/avaliacao`
- `GET /api/grupos`
- `GET /api/me/pontuacoes`
- `GET /api/rankings` e `GET /api/rankings/geral`
- `GET /api/me/dashboard`
- `GET /api/admin/dashboard`
- `GET /api/admin/relatorios/participacao`
- `GET /api/admin/relatorios/baixa-participacao`
- `GET /api/docs` (Swagger UI)

## Pilares padrão

Ao conectar no MongoDB, a API executa um seed idempotente dos 7 pilares do Método do Alavanque:

- Conhecimento Técnico Alinhado ao Mercado
- Posicionamento e Softskills
- Prática
- Exposição a Problemas
- Compartilhamento
- Networking
- Visibilidade

## Pontuação

Desafios podem usar pontuação fixa ou pontuação por dificuldade:

| Dificuldade | Pontos |
| --- | ---: |
| facil | 10 |
| medio | 20 |
| dificil | 30 |
| extra | 50 |

Se o admin/professor informar `points`, a pontuação customizada é preservada. Se informar apenas `difficulty`, a pontuação padrão é aplicada automaticamente.

## Coleções principais

- `users`: alunos, professores e administradores
- `turmas`: turmas da mentoria
- `alunos_turmas`: vínculo histórico entre alunos e turmas
- `pilares`: tópicos do Método do Alavanque
- `desafios`: desafios cadastrados com pilar, dificuldade, pontos e tipo
- `envios_desafios`: registros enviados pelos alunos
- `participantes_envio`: participantes ativos/removidos de envios em grupo
- `pontuacoes`: histórico de pontos concedidos após aprovação

## Regras consolidadas

- Apenas alunos registram envios de desafios.
- Envios começam com status `pendente`.
- Evidência é obrigatória.
- Envios em grupo usam participantes em coleção própria e mantêm array legado para compatibilidade.
- Grupo respeita o limite máximo definido no desafio, até 5 participantes.
- Professor/admin pode aprovar, reprovar ou solicitar ajuste.
- Ao aprovar, a API gera pontuação para responsável e participantes ativos.
- Rankings e dashboards consideram pontuações de envios aprovados.

## Próximos passos planejados

- Ampliar a documentação Swagger com exemplos detalhados de todos os contratos
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
