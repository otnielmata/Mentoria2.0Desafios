# Desafios Mentoria 2.0 - Web

Estrutura inicial da aplicacao web em Next.js para consumir a API REST do projeto Mentoria 2.0 Desafios.

## Stack

- Next.js
- React
- JavaScript
- JWT emitido pela API REST
- API REST Express + MongoDB como backend

## Arquitetura

```text
web/
  docs/             # Documentacao tecnica do front-end
  scripts/          # Validacoes locais de qualidade, ambiente e formatacao
  src/
    app/             # Views e rotas do Next.js
    components/      # Componentes visuais reutilizaveis
    config/          # Regras compartilhadas de rotas, perfis e autorizacao visual
    controllers/     # Orquestracao das acoes das telas
    models/          # Validacoes e contratos de entrada
    services/        # Integracao com API REST e sessao local
```

Guia detalhado: [docs/frontend-architecture.md](docs/frontend-architecture.md).

## Configuracao

1. Copie o exemplo de ambiente:

```bash
cp web/.env.example web/.env.local
```

2. Ajuste a URL da API REST:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Para producao, use `web/.env.production.example` como referencia e configure as variaveis no provedor de deploy, sem versionar arquivos reais de ambiente.

## Instalar dependencias

```bash
cd web
npm install
```

## Scripts

- `npm run dev`: inicia a aplicacao em modo desenvolvimento, reiniciando quando arquivos forem alterados
- `npm start`: inicia a aplicacao em modo estatico/producao depois do build
- `npm run build`: gera a versao de producao
- `npm run env:check`: valida variaveis publicas da web para o ambiente local
- `npm run deploy:check`: valida ambiente de producao e executa o pipeline de qualidade
- `npm run lint`: executa validacao estatica local sem depender de API real
- `npm run format:check`: verifica padrao de formatacao dos arquivos do front-end
- `npm run format`: corrige quebras de linha, nova linha final e espacos finais
- `npm run quality`: executa lint, formatacao, testes unitarios e build
- `npm test`: executa testes unitarios da camada web

## Telas iniciais

- Inicio
- Login
- Registrar usuario
- Dashboard
- Registrar desafio
- Meus desafios
- Minha pontuacao
- Meus grupos
- Ranking
- Meu perfil
- Areas administrativas de alunos, turmas, pilares, desafios, aprovacoes, grupos, relatorios e configuracoes

## Rotas publicas e protegidas

As regras de acesso ficam centralizadas em `src/config/access-control.js`.

- `/`, `/login` e `/registro` sao rotas publicas
- `/dashboard`, `/registrar-desafio`, `/meus-desafios`, `/minha-pontuacao`, `/meus-grupos`, `/ranking` e `/perfil` exigem sessao JWT local
- Areas administrativas como `/alunos`, `/turmas`, `/pilares`, `/desafios`, `/aprovacoes`, `/grupos`, `/relatorios` e `/configuracoes` exigem perfil `professor` ou `admin`
- Acesso sem sessao em rota protegida redireciona para `/login?redirect=...`
- O login usa o parametro `redirect` seguro para retornar a rota desejada
- Menus autenticados sao filtrados por perfil: `aluno`, `professor` e `admin`
- A autorizacao visual da web nao substitui a autorizacao da API REST

## Cliente HTTP da API REST

O consumo da API REST usa `src/services/api/client.js` como ponto unico de configuracao.

- URL base lida da configuracao publica em `src/config/env.js`
- `NEXT_PUBLIC_API_BASE_URL` define a API REST para local, homologacao ou producao
- Token JWT aplicado no header `Authorization` em chamadas protegidas
- Login e registro usam chamadas publicas com `auth: false`
- Erros de rede, API e validacao sao normalizados para controllers e views
- Endpoints ficam centralizados em `src/services/api/endpoints.js`
- Views continuam sem montar requisicoes HTTP diretamente
- O dashboard do aluno consome apenas `GET /api/dashboard/aluno` para exibir pontos totais, ranking, desafios aprovados, desafios pendentes e pontuacao por pilar

## Sessao autenticada

O gerenciamento de sessao usa `src/services/session.service.js`.

- Login e registro salvam somente token e dados minimos do usuario
- Senhas e campos sensiveis nao sao persistidos
- Sessao persistida e restaurada ao recarregar a aplicacao
- Logout remove os dados locais de autenticacao
- Tokens expirados sao descartados quando a sessao e restaurada
- Respostas `401` em chamadas protegidas limpam a sessao e indicam novo login
- Guards de rota e cliente HTTP consomem a mesma fonte de sessao

## Models, DTOs e validacoes

Os contratos reutilizaveis ficam em `src/models/`.

- Auth possui DTOs de login, registro e resposta autenticada
- Dashboard do aluno possui DTO de leitura para indicadores, pontuacao por pilar e ultimos desafios enviados
- As proximas entidades de dominio devem seguir DTOs por caso de uso: desafios, envios, pilares, turmas, rankings e pontuacoes
- Formularios validam obrigatoriedade e formato antes da chamada HTTP
- Controllers convertem erros de validacao da API em `fieldErrors`
- Views exibem erros especificos nos campos correspondentes
- Validacoes do front nao substituem as validacoes da API REST

## Padrao de formularios

Login, registro e novos formularios de desafios usam o mesmo ciclo de formulario em `src/controllers/form.controller.js` e `src/models/form.model.js`.

- Estados previsiveis: `idle`, `loading`, `success` e `error`
- Submissao bloqueada enquanto a chamada anterior ainda esta em andamento
- Validacao do front exibida por campo antes da chamada HTTP
- Erros da API exibidos em alerta visivel e associados ao campo quando possivel
- Campos nao sensiveis permanecem preenchidos apos erro para facilitar a correcao

## Componentes base de UI

A biblioteca inicial fica em `src/components/ui/`.

- `Button`: variantes visuais, loading e disabled
- `Input` e `Textarea`: label, texto de ajuda, erro por campo e acessibilidade
- `Alert`: mensagens de erro e sucesso definidas pela view
- `DataList`: painel reutilizavel para listagens
- `LoadingState`, `ErrorState`, `EmptyState` e `AsyncStateView`: padrao de feedback para carregamento, falha e lista vazia
- `ErrorFallback`: fallback seguro para erros inesperados sem expor detalhes tecnicos
- Componentes usam tokens CSS globais para tema claro/escuro, foco, erro e estados interativos

## Estados assíncronos e erros globais

Estados de consulta ficam padronizados em `src/models/async-state.model.js`.

- Telas podem representar `idle`, `loading`, `success`, `empty` e `error`
- Erros de rede e autenticacao recebem mensagens compreensiveis para o usuario
- Quando fizer sentido, o estado de erro oferece acao de tentar novamente
- `src/app/loading.js`, `src/app/error.js` e `src/app/global-error.js` cobrem carregamento e falhas inesperadas de renderizacao
- Logs tecnicos ficam restritos ao desenvolvimento e nao aparecem no texto final da interface

## Dashboard do aluno

A rota protegida `/dashboard` carrega os indicadores do aluno autenticado pela API REST.

- Endpoint unico da funcionalidade: `GET /api/dashboard/aluno`
- A view chama `src/controllers/dashboard.controller.js`
- O controller normaliza a resposta com `src/models/dashboard.model.js`
- O service `src/services/dashboard.service.js` concentra a chamada ao endpoint
- Estados de carregamento, erro, vazio e retry usam `AsyncStateView`
- O front-end apenas exibe ranking e pontuacao consolidados pela API

## Observabilidade mínima

O logger inicial fica em `src/services/logger.service.js`.

- Registra erros tecnicos no console apenas em desenvolvimento
- Sanitiza chaves e mensagens para nao expor senhas, tokens, authorization, JWT ou segredos
- Falhas de API registram endpoint, metodo, status, tipo e mensagem sanitizada
- Error boundaries registram falhas de renderizacao com `logError`
- Logs nao substituem feedback visual amigavel para o usuario

## Acessibilidade e responsividade

As telas iniciais foram preparadas para uso por teclado, leitores de tela e telas pequenas.

- O shell possui link de pular para o conteudo principal
- Campos usam `label`, `id`, `aria-describedby`, `aria-invalid` e `aria-errormessage`
- Erros tambem sao sinalizados por texto e borda, nao apenas por cor
- Foco visivel usa token de contraste especifico para tema claro e escuro
- Layouts usam grids flexiveis e quebra de conteudo para evitar rolagem horizontal indevida no mobile
- A interface respeita `prefers-reduced-motion`

## Qualidade de codigo e testes

A pasta `scripts/` contem validacoes locais para manter o front-end evolutivo sem adicionar dependencias nesta fase inicial.

- `scripts/lint.mjs` bloqueia testes focados, `debugger`, consoles de depuracao e `fetch` direto fora do adapter HTTP
- `scripts/format-check.mjs` padroniza quebras de linha, nova linha final e espacos finais
- `scripts/validate-env.mjs` valida variaveis publicas e bloqueia nomes de segredo com `NEXT_PUBLIC_`
- Os testes unitarios cobrem models, controllers, services, estados assíncronos, componentes base e contratos de acessibilidade
- Services e adapters usam mocks/fetchers injetaveis nos testes, sem chamada para API real

## Build, ambiente e deploy

O build usa Next.js e permanece reprodutivel com `npm run build` ou com o pipeline completo `npm run quality`.

- Variaveis expostas ao navegador devem usar `NEXT_PUBLIC_`
- Segredos como tokens, senhas, JWT secret, MongoDB URI ou chaves privadas nao devem usar `NEXT_PUBLIC_`
- Arquivos reais como `.env.local`, `.env.production` e `.env.test` sao ignorados pelo Git
- `web/vercel.json` deixa o projeto preparado para deploy na Vercel usando `npm ci` e `npm run quality`
- Em Vercel, configure `NEXT_PUBLIC_API_BASE_URL` nas variaveis do projeto para cada ambiente
- Depois do deploy, valide telas publicas (`/`, `/login`, `/registro`) e rotas protegidas do aluno/admin

## Integracao com a API

A aplicacao web nao acessa o MongoDB diretamente. O banco, a autenticacao JWT e as regras de negocio permanecem na API REST. A web consome os endpoints por meio de `NEXT_PUBLIC_API_BASE_URL` e armazena o token JWT localmente para chamadas autenticadas.

## Documentacao tecnica

O documento [docs/frontend-architecture.md](docs/frontend-architecture.md) descreve a estrutura Next.js/MVC, fluxo View -> Controller -> Model/Service -> API REST, comandos principais, variaveis de ambiente, endpoints iniciais e padroes de tema/UI.
