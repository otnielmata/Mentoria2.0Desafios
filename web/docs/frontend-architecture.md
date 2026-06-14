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
- Rotas protegidas do admin/professor: `/dashboard`, `/alunos`, `/turmas`, `/pilares`, `/desafios`, `/aprovacoes`, `/grupos`, `/ranking`, `/relatorios`, `/configuracoes`
- Regras de acesso ficam em `src/config/access-control.js`
- Sessao JWT fica em `src/services/session.service.js`
- Respostas `401` em chamadas protegidas limpam a sessao local
- O front-end oculta e protege navegacao visual, mas a autorizacao final continua na API REST

## Endpoints iniciais consumidos

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/dashboard/aluno
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
