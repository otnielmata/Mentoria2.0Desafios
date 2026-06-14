# Arquitetura Front-end

Este documento orienta novas implementacoes da aplicacao Web Desafios Mentoria 2.0. A web usa Next.js App Router com uma organizacao em camadas inspirada em MVC para manter telas, regras de interface e integracao com a API REST separadas.

## Estrutura de pastas

```text
web/
  docs/              # Documentacao tecnica do front-end
  scripts/           # Validacoes locais de qualidade, ambiente e formatacao
  src/
    app/             # Rotas, layouts e pages do Next.js
    components/      # Componentes visuais reutilizaveis
    config/          # Configuracoes compartilhadas de ambiente, rotas e acesso
    controllers/     # Orquestracao das acoes chamadas pelas views
    models/          # DTOs, validacoes e normalizacao de dados
    services/        # Adapters para API REST e sessao local
```

## Papel das camadas

- `src/app`: define as rotas, views e fallbacks do Next.js. Pages devem montar a experiencia e delegar regra para controllers, models e services.
- `src/components`: concentra UI reutilizavel, layout, tema e guardas de autenticacao. Componentes base recebem texto e dados por props.
- `src/config`: centraliza configuracao compartilhada, como ambiente publico e regras de rotas/perfis.
- `src/controllers`: recebe payloads da view, chama validacoes/models e aciona services.
- `src/models`: transforma payloads em DTOs, valida dados antes da API e normaliza respostas.
- `src/services`: isola integracao com API REST, armazenamento de sessao e token JWT.
- `scripts`: executa validacoes de qualidade sem depender de API real.

## Fluxo de dados

O fluxo padrao de uma acao da tela e:

```text
View em src/app
  -> Controller em src/controllers
  -> Model em src/models
  -> Service em src/services
  -> API REST configurada por NEXT_PUBLIC_API_BASE_URL
```

Exemplo no login:

```text
src/app/login/page.js
  -> loginUser em src/controllers/auth.controller.js
  -> validateLoginPayload em src/models/auth.model.js
  -> loginRequest em src/services/auth.service.js
  -> apiRequest em src/services/api/client.js
```

Views nao devem montar `fetch` direto nem conhecer detalhes de endpoint. Endpoints ficam em `src/services/api/endpoints.js` e chamadas HTTP passam por `src/services/api/client.js`.

## Rotas e autenticacao

- Rotas publicas: `/`, `/login`, `/registro`
- Rotas protegidas do aluno: `/dashboard`, `/registrar-desafio`, `/meus-desafios`, `/minha-pontuacao`, `/meus-grupos`, `/ranking`, `/perfil`
- Rotas protegidas do admin/professor: `/dashboard`, `/perfil`, `/alunos`, `/turmas`, `/pilares`, `/desafios`, `/aprovacoes`, `/grupos`, `/ranking`, `/relatorios`, `/configuracoes`
- Regras de acesso ficam em `src/config/access-control.js`
- Sessao JWT fica em `src/services/session.service.js`
- Respostas `401` em chamadas protegidas limpam a sessao local
- O front-end oculta e protege navegacao visual, mas a autorizacao final continua na API REST

## Menus por perfil

Nenhum endpoint novo e necessario para navegacao por perfil. Os menus sao derivados da `role` salva na sessao autenticada.

- Aluno: Inicio, Registrar Desafio, Meus Desafios, Minha Pontuacao, Ranking e Meu Perfil
- Professor/Admin: Dashboard, Alunos, Turmas, Pilares, Desafios, Aprovacoes, Grupos, Ranking, Relatorios e Configuracoes
- Rota fora do perfil mostra bloqueio visual pelo `AuthGuard`
- A API REST continua responsavel pela autorizacao definitiva de cada endpoint

## Endpoints iniciais consumidos

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/dashboard/aluno
GET  /api/dashboard/admin
POST /api/envios-desafios
GET  /api/envios-desafios/meus
GET  /api/pontuacoes/minha
GET  /api/ranking
GET  /api/users/me
```

A web nao acessa MongoDB diretamente. Todo dado de negocio passa pela API REST.

## Formularios

Login, registro e novos formularios de desafios usam o padrao em `src/controllers/form.controller.js` e `src/models/form.model.js`.

- Estados: `idle`, `loading`, `success`, `error`
- Validacao ocorre antes da chamada HTTP
- Erros de campo sao exibidos em `Input` e `Textarea`
- Dados nao sensiveis permanecem na tela apos erro
- Campos sensiveis podem ser limpos conforme decisao de UX/seguranca

## Estados assíncronos

Consultas usam `src/models/async-state.model.js` e `AsyncStateView`.

- `loading`: exibe progresso contextual
- `empty`: informa ausencia de dados
- `error`: mostra mensagem segura e retry quando fizer sentido
- `success`: renderiza o conteudo da view

Erros inesperados de renderizacao usam `src/app/error.js` e `src/app/global-error.js`, sem expor stack ou detalhes sensiveis para o usuario final.

## Dashboard do aluno

O dashboard do aluno segue o fluxo padrao da arquitetura:

```text
src/app/dashboard/page.js
  -> getStudentDashboard em src/controllers/dashboard.controller.js
  -> toStudentDashboardDto em src/models/dashboard.model.js
  -> getStudentDashboardRequest em src/services/dashboard.service.js
  -> GET /api/dashboard/aluno
```

Essa tela nao calcula ranking no navegador. Ela exibe pontos totais, posicao no ranking, desafios aprovados, desafios pendentes, pontuacao por pilar e ultimos envios conforme dados consolidados pela API REST.

## Dashboard admin

O dashboard geral de professor/admin segue o fluxo:

```text
src/app/dashboard/page.js
  -> getAdminDashboard em src/controllers/dashboard.controller.js
  -> toAdminDashboardDto em src/models/dashboard.model.js
  -> getAdminDashboardRequest em src/services/dashboard.service.js
  -> GET /api/dashboard/admin
```

A rota `/dashboard` escolhe o fluxo pela `role` salva na sessao. Alunos continuam no dashboard do aluno; professor e admin veem indicadores gerais, alunos ativos, total de envios, envios pendentes, alunos mais engajados e baixa participacao. O front-end nao calcula indicadores e nao exibe dados sensiveis em cards resumidos.

## Registro de desafio

O registro de desafio realizado segue o fluxo padrao:

```text
src/app/registrar-desafio/page.js
  -> submitChallengeSubmission em src/controllers/challenge-submission.controller.js
  -> validateChallengeSubmissionPayload em src/models/challenge-submission.model.js
  -> submitChallengeSubmissionRequest em src/services/challenge-submission.service.js
  -> POST /api/envios-desafios
```

A tela nao busca listas auxiliares nesta historia para manter o limite de um endpoint. Ela envia pilar, desafio, turma, tipo individual/grupo, descricao, evidencias e participantes. A API REST continua responsavel por validar o aluno autenticado, desafio ativo, turma, participantes e status inicial pendente.

## Meus desafios

O historico de desafios do aluno segue o fluxo:

```text
src/app/meus-desafios/page.js
  -> getMyChallengeSubmissions em src/controllers/my-challenge-submissions.controller.js
  -> toMyChallengeSubmissionsDto em src/models/my-challenge-submissions.model.js
  -> getMyChallengeSubmissionsRequest em src/services/my-challenge-submissions.service.js
  -> GET /api/envios-desafios/meus
```

A tela lista desafio, pilar, data, tipo e status. Status sempre possui texto visivel alem de estilo visual, e detalhes expansivos exibem descricao, evidencias e feedback do professor para envios reprovados ou com ajuste solicitado.

## Minha pontuacao

A consulta de pontuacao do aluno segue o fluxo:

```text
src/app/minha-pontuacao/page.js
  -> getMyScore em src/controllers/my-score.controller.js
  -> toMyScoreDto em src/models/my-score.model.js
  -> getMyScoreRequest em src/services/my-score.service.js
  -> GET /api/pontuacoes/minha
```

A tela exibe pontuacao total, pontos por pilar e historico conforme dados consolidados pela API REST. O front-end nao soma pontuacoes no navegador; ele apenas normaliza nomes de campos, mostra os 7 topicos do Metodo do Alavanque e orienta o aluno quando ainda nao existem pontos aprovados.

## Ranking

O ranking geral segue o fluxo:

```text
src/app/ranking/page.js
  -> getGeneralRanking em src/controllers/ranking.controller.js
  -> toRankingDto em src/models/ranking.model.js
  -> getGeneralRankingRequest em src/services/ranking.service.js
  -> GET /api/ranking
```

A tela exibe posicao, nome do aluno e pontos retornados pela API REST. O front-end nao recalcula classificacao, nao mostra dados sensiveis dos alunos e identifica o usuario atual por destaque visual e texto acessivel quando ele aparece no ranking.

## Meu perfil

O perfil do usuario autenticado segue o fluxo:

```text
src/app/perfil/page.js
  -> getProfile em src/controllers/profile.controller.js
  -> toProfileDto em src/models/profile.model.js
  -> getProfileRequest em src/services/profile.service.js
  -> GET /api/users/me
```

A tela exibe nome, e-mail, perfil e status do usuario autenticado. O DTO descarta campos sensiveis, como senha, token e segredos, e a sessao invalida continua sendo tratada pelo cliente HTTP e pelo `AuthGuard`, que redireciona para login quando necessario.

## Observabilidade mínima

A observabilidade inicial fica em `src/services/logger.service.js`.

- O logger usa console apenas em desenvolvimento
- Eventos sao sanitizados antes do registro
- Chaves como `password`, `senha`, `token`, `authorization`, `jwt`, `secret` e `private` sao mascaradas
- Erros de API registram endpoint, metodo, status, tipo e mensagem sanitizada
- Erros de renderizacao passam por `logError` nos error boundaries
- A mensagem exibida ao usuario continua simples e sem stack trace

O logger atual e propositalmente pequeno e pode ser substituido futuramente por uma ferramenta externa de monitoramento sem alterar as views.

## Tema e UI

O tema claro/escuro usa tokens CSS em `src/app/globals.css`.

- Cores, bordas, sombra, foco e estados usam variaveis CSS
- `ThemeProvider` aplica o tema salvo no navegador
- `ThemeToggle` alterna entre claro e escuro
- Componentes base vivem em `src/components/ui`
- Estados de erro usam texto e borda, nao apenas cor
- Foco visivel deve permanecer claro em ambos os temas

Componentes base atuais:

- `Button`
- `Input`
- `Select`
- `Textarea`
- `Alert`
- `DataList`
- `LoadingState`, `ErrorState`, `EmptyState`, `AsyncStateView`
- `ErrorFallback`

## Acessibilidade e responsividade

- O shell possui link de pular para o conteudo principal
- Navegacoes possuem `aria-label`
- Campo deve ter label associado por `htmlFor` e `id`
- Erros devem usar `aria-invalid`, `aria-describedby` e `aria-errormessage`
- Layouts usam grids flexiveis com `minmax(0, ...)`
- O CSS evita rolagem horizontal indevida e respeita `prefers-reduced-motion`

## Variaveis de ambiente

Variaveis publicas expostas ao navegador devem usar `NEXT_PUBLIC_`.

```text
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Para producao, use `web/.env.production.example` como referencia e configure as variaveis no provedor de deploy.

Nao use `NEXT_PUBLIC_` para segredos, tokens privados, `JWT_SECRET`, `MONGODB_URI`, senhas ou chaves privadas. Esses valores nao devem ir para o bundle do cliente.

## Comandos principais

Execute dentro de `web/`.

```bash
npm install
npm run dev
npm start
npm run build
npm test
npm run lint
npm run format:check
npm run quality
npm run deploy:check
```

Uso esperado:

- Desenvolvimento local: `npm run dev`
- Testes unitarios: `npm test`
- Verificacao completa local: `npm run quality`
- Preparacao de producao: `npm run deploy:check`

## Build e deploy

O build usa Next.js:

```bash
npm run build
```

O deploy na Vercel usa `web/vercel.json`:

```json
{
  "installCommand": "npm ci",
  "buildCommand": "npm run quality",
  "framework": "nextjs"
}
```

Apos publicar, valide:

- `/`, `/login` e `/registro` carregam publicamente
- Rotas protegidas de aluno e admin respeitam autenticacao
- A URL configurada em `NEXT_PUBLIC_API_BASE_URL` aponta para a API REST correta

## Regras para novas funcionalidades

- Crie a rota/view em `src/app`
- Reutilize componentes de `src/components/ui`
- Coloque validacao e DTOs em `src/models`
- Orquestre casos de uso em `src/controllers`
- Consuma API somente por `src/services`
- Atualize endpoints em `src/services/api/endpoints.js`
- Cubra regras novas com testes unitarios
- Atualize este documento quando criar um novo padrao assumido pelo projeto
