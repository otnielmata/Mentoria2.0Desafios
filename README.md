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
  docs/             # Documentação técnica do front-end
  scripts/          # Validações locais de qualidade, ambiente e formatação
  src/
    app/             # Views e rotas do Next.js
    components/      # Componentes visuais reutilizaveis
    controllers/     # Orquestracao das acoes das telas
    models/          # Validacoes e contratos de entrada
    services/        # Integracao com API REST e sessao local
```

Detalhes de arquitetura e padrões do front-end ficam em `web/docs/frontend-architecture.md`.

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

Para publicação, use `web/.env.production.example` como referência e configure as variáveis diretamente no provedor de deploy. Arquivos reais de ambiente da web ficam ignorados no Git.

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
- `npm run env:check`: valida variáveis públicas da web
- `npm run deploy:check`: valida ambiente de produção e executa o pipeline de qualidade
- `npm run lint`: executa validação estática local do front-end
- `npm run format:check`: verifica formatação consistente
- `npm run format`: corrige quebras de linha, nova linha final e espaços finais
- `npm run quality`: executa lint, formatação, testes unitários e build
- `npm test`: executa testes unitários da aplicação web

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
- Registrar desafio
- Meus desafios
- Minha pontuação
- Ranking
- Meu perfil
- Menus administrativos de alunos, turmas, pilares, desafios, aprovações, grupos, relatórios e configurações

## Integração Web + API

A aplicação web não acessa o MongoDB diretamente. O MongoDB, a autenticação JWT e as regras de negócio continuam centralizados na API REST. A web consome os endpoints por meio da variável `NEXT_PUBLIC_API_BASE_URL` e armazena o token JWT localmente para chamadas autenticadas.

## Rotas E Guardas Da Web

A aplicação web separa rotas públicas e protegidas em `web/src/config/access-control.js`. Login e registro ficam públicos; rotas de desafios, pontuação, ranking, perfil e áreas administrativas exigem sessão JWT local. Quando uma rota protegida é acessada sem sessão, o front redireciona para login preservando a rota desejada em `redirect`. A navegação também filtra links por perfil (`aluno`, `professor`, `admin`), sem substituir a autorização final feita pela API.

## Cliente HTTP Da Web

A integração da web com a API REST fica centralizada em `web/src/services/api/client.js`. A URL base vem da configuração pública em `web/src/config/env.js`, usando `NEXT_PUBLIC_API_BASE_URL`; headers e token JWT são tratados no cliente, erros de API/rede/validação são normalizados para controllers e views, e os endpoints ficam reunidos em `web/src/services/api/endpoints.js`.

O dashboard do aluno consome `GET /api/dashboard/aluno` pela camada `web/src/services/dashboard.service.js` e exibe os indicadores consolidados pela API REST.

O registro de desafio do aluno consome `POST /api/envios-desafios` pela camada `web/src/services/challenge-submission.service.js`, preservando a API REST como responsavel por validar o aluno autenticado, turma, desafio, participantes e status pendente.

## Sessão Autenticada Da Web

A sessão autenticada fica centralizada em `web/src/services/session.service.js`. O front salva apenas token e dados mínimos do usuário, remove campos sensíveis, restaura sessão persistida ao recarregar, limpa dados no logout e descarta sessão expirada ou inválida. Respostas `401` em chamadas protegidas limpam a sessão e orientam novo login.

## Models E DTOs Da Web

Os contratos de request/response e validações do front ficam em `web/src/models/`. Autenticação possui DTOs separados para login, registro e resposta autenticada. Novos fluxos de desafios, envios, pilares, turmas, rankings e pontuações devem seguir DTOs por caso de uso. Controllers usam esses contracts antes de chamar services e também mapeiam erros de validação da API para `fieldErrors`, permitindo mensagens específicas por campo nas views.

## Formulários Da Web

Login, registro e novos formulários de desafios compartilham um controlador de formulário para estados `idle`, `loading`, `success` e `error`. Esse padrão bloqueia reenvio durante carregamento, mantém dados não sensíveis após erro, exibe falhas gerais em alerta acessível e associa erros de validação aos campos quando a API ou o front retornam detalhes por campo.

## Componentes Base Da Web

A biblioteca inicial de UI fica em `web/src/components/ui/`. Ela reúne botão com estado loading/disabled, inputs e textarea com label/ajuda/erro acessíveis, alertas, painel de lista e estados reutilizáveis de loading, erro e vazio. Os componentes usam tokens globais de tema e mantêm textos de negócio nas views.

## Estados Assíncronos Da Web

Consultas da web usam estados padronizados em `web/src/models/async-state.model.js`: `idle`, `loading`, `success`, `empty` e `error`. As telas de domínio devem renderizar carregamento, vazio, erro de API/rede e ação de tentar novamente pelo mesmo componente reutilizável. A aplicação também possui fallback de erro inesperado em `web/src/app/error.js` e `web/src/app/global-error.js`, sem expor detalhes técnicos ao usuário final.

## Observabilidade Da Web

A web possui logger mínimo em `web/src/services/logger.service.js`, habilitado para console em desenvolvimento. Falhas de API registram endpoint, método, status, tipo e mensagem sanitizada; erros de renderização passam pelos error boundaries. Senhas, tokens, authorization, JWT e segredos são mascarados antes do log, e a interface mantém mensagens simples para o usuário.

## Acessibilidade E Responsividade Da Web

A aplicação web possui link de pular para conteúdo, foco visível em controles interativos, campos com associação explícita entre label/erro/descrição e estilos responsivos para login, registro, dashboard e páginas de desafios. Os estados de erro usam texto e borda além da cor, e os tokens de foco/contraste foram definidos para tema claro e escuro.

## Qualidade De Código Da Web

A aplicação web possui scripts locais de qualidade em `web/scripts/`: lint crítico, verificação/correção simples de formatação, testes unitários e comando agregado `npm run quality`. Os testes evitam dependência de API real e cobrem validações, services/adapters, estados de carregamento/erro e contratos dos componentes base.

## Build E Deploy Da Web

A web possui validação de ambiente em `web/scripts/validate-env.mjs`, exemplo de produção em `web/.env.production.example` e configuração mínima de Vercel em `web/vercel.json`. O pipeline recomendado para publicação é `npm run deploy:check`, que valida variáveis públicas, executa qualidade, testes e build. Segredos não devem usar `NEXT_PUBLIC_`, pois variáveis com esse prefixo entram no bundle do cliente.

## Documentação Técnica Da Web

O guia `web/docs/frontend-architecture.md` documenta estrutura de pastas, responsabilidades das camadas Next.js/MVC, fluxo de dados, comandos principais, variáveis de ambiente, endpoints iniciais consumidos e padrões de tema/UI.

## Próximos passos planejados

- Evoluir endpoints com base nas user stories do Jira
- Adicionar testes automatizados
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
