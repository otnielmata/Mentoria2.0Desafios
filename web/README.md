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
- Menu do aluno: Inicio, Registrar Desafio, Meus Desafios, Minha Pontuacao, Meus Grupos, Ranking e Meu Perfil
- Menu de professor/admin: Dashboard, Alunos, Turmas, Pilares, Desafios, Aprovacoes, Grupos, Ranking, Relatorios e Configuracoes
- Sessao autenticada sem `role` valido nao recebe fallback para aluno e exige novo login
- A autorizacao visual da web nao substitui a autorizacao da API REST

## Cliente HTTP da API REST

O consumo da API REST usa `src/services/api/client.js` como ponto unico de configuracao.

- URL base lida da configuracao publica em `src/config/env.js`
- `NEXT_PUBLIC_API_BASE_URL` define a API REST para local, homologacao ou producao
- Token JWT aplicado no header `Authorization` em chamadas protegidas
- Login e registro usam chamadas publicas com `auth: false`
- Login e registro persistem `role` e `status` retornados pela API para menus e rotas por perfil
- Respostas de autenticacao sem `role` ou `status` validos sao recusadas como sessao invalida
- Erros de rede, API e validacao sao normalizados para controllers e views
- Endpoints ficam centralizados em `src/services/api/endpoints.js`
- Views continuam sem montar requisicoes HTTP diretamente
- A tela Configuracoes consome apenas `GET /api/configuracoes` para exibir parametros iniciais em modo somente leitura
- O dashboard do aluno consome apenas `GET /api/dashboard/aluno` para exibir pontos totais, ranking, desafios aprovados, desafios pendentes e pontuacao por pilar
- O dashboard de professor/admin consome apenas `GET /api/dashboard/admin` para exibir alunos ativos, envios, aprovacoes pendentes e engajamento
- A tela Pilares consome apenas `GET /api/pilares` para listar os topicos cadastrados do Metodo do Alavanque
- A tela Alunos consome apenas `/api/users`, com `GET` para listar e `POST` para cadastrar participantes da mentoria
- A tela Turmas consome apenas `/api/turmas`, com `GET` para listar e `POST` para cadastrar ciclos da mentoria
- A tela Desafios consome apenas `/api/desafios`, com `GET` para listar e `POST` para cadastrar desafios com pontuacao fixa
- A tela Aprovacoes consome apenas `/api/envios-desafios/aprovacoes`, com `GET` para listar pendencias e `PATCH` para aprovar, reprovar ou solicitar ajuste
- A tela Grupos consome apenas `GET /api/grupos` para consultar grupos formados em envios coletivos
- A tela Meus Grupos consome apenas `GET /api/grupos/meus` para consultar grupos do aluno autenticado
- O registro de desafio consome apenas `POST /api/envios-desafios` para enviar execucoes individuais ou em grupo para aprovacao
- A tela Meus Desafios consome apenas `GET /api/envios-desafios/meus` para listar envios, status e feedback do professor
- A tela Minha Pontuacao consome apenas `GET /api/pontuacoes/minha` para exibir total, pontos por pilar e historico concedido
- A tela Ranking consome apenas `GET /api/ranking` para exibir classificacao geral com posicao, aluno e pontos
- A tela Meu Perfil consome apenas `GET /api/users/me` para exibir dados cadastrais seguros do usuario autenticado

## Sessao autenticada

O gerenciamento de sessao usa `src/services/session.service.js`.

- Login e registro salvam somente token e dados minimos do usuario
- A sessao local preserva `role` e `status` para liberar menus de aluno, professor e admin
- Sessao local sem `role` ou `status` validos e descartada e tratada como necessidade de novo login
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
- Dashboard admin possui DTO de leitura para indicadores gerais, alunos mais engajados e baixa participacao
- Pilares possui DTO de leitura para nome, descricao e status dos topicos cadastrados na API
- Alunos possui DTOs de listagem e cadastro para nome, e-mail, papel, status e turma sem expor senha
- Turmas possui DTOs de listagem e cadastro para nome, data de inicio, data de fim e status
- Desafios possui DTOs de listagem e cadastro para pilar, titulo, descricao, pontos fixos, tipo, maximo de participantes e status
- Configuracoes possui DTO de leitura para parametros iniciais, visibilidade de ranking e disponibilidade de edicao sem expor segredos tecnicos
- Aprovacoes possui DTOs para envios pendentes e avaliacao com status, feedback e identificacao do envio
- Grupos possui DTO de leitura para envio, pilar, lider, participantes, turma, pontos, ranking e status sem expor dados sensiveis
- Registro de desafio possui DTO de envio com pilar, desafio, turma, tipo, descricao, evidencias e participantes
- Meus desafios possui DTO de leitura para desafio, pilar, data, tipo, status, evidencias e feedback do professor
- Minha pontuacao possui DTO de leitura para total, pontuacao por pilar e historico de pontos concedidos
- Ranking possui DTO de leitura para posicao, aluno, pontos e identificacao do usuario atual sem expor dados sensiveis
- Perfil possui DTO de leitura para nome, e-mail, perfil, status e turmas sem expor senha, token ou segredos
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
- `Input`, `Select` e `Textarea`: label, texto de ajuda, erro por campo e acessibilidade
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

A rota protegida `/dashboard` carrega os indicadores do aluno autenticado pela API REST quando a sessao possui perfil `aluno`.

- Endpoint unico da funcionalidade: `GET /api/dashboard/aluno`
- A view chama `src/controllers/dashboard.controller.js`
- O controller normaliza a resposta com `src/models/dashboard.model.js`
- O service `src/services/dashboard.service.js` concentra a chamada ao endpoint
- Estados de carregamento, erro, vazio e retry usam `AsyncStateView`
- O front-end apenas exibe ranking e pontuacao consolidados pela API

## Dashboard admin

A mesma rota protegida `/dashboard` carrega o dashboard geral quando a sessao possui perfil `professor` ou `admin`.

- Endpoint unico da funcionalidade admin: `GET /api/dashboard/admin`
- A view chama `src/controllers/dashboard.controller.js`
- O model `src/models/dashboard.model.js` normaliza alunos ativos, total de envios, aprovacoes pendentes, engajamento e destaques
- O service `src/services/dashboard.service.js` concentra a chamada ao endpoint
- Alunos mais engajados e baixa participacao aparecem em listas resumidas sem dados sensiveis
- O front-end nao calcula indicadores; apenas exibe dados consolidados pela API REST

## Pilares

A rota protegida `/pilares` permite que professor/admin consulte os topicos do Metodo do Alavanque cadastrados na API.

- Endpoint unico da funcionalidade: `GET /api/pilares`
- A view chama `src/controllers/pillars.controller.js`
- O model `src/models/pillars.model.js` normaliza nome, descricao e status
- O service `src/services/pillars.service.js` concentra a chamada ao endpoint
- A tela exibe cobertura dos 7 pilares principais sem recriar seed no front-end
- Estado vazio orienta a configuracao inicial pela API/admin
- A lista de pilares usada em `/registrar-desafio` tambem vem desse mesmo fluxo de API

## Alunos

A rota protegida `/alunos` permite que professor/admin liste e cadastre participantes da mentoria.

- Endpoint unico da funcionalidade: `/api/users`
- A listagem usa `GET /api/users`
- O cadastro usa `POST /api/users`
- A view chama `src/controllers/users.controller.js`
- O model `src/models/users.model.js` normaliza nome, e-mail, papel, status e turma
- O service `src/services/users.service.js` concentra a chamada ao endpoint
- O formulario valida nome e e-mail antes do envio para a API
- A lista exibe nome, e-mail, papel, status e turma quando disponivel, sem exibir senha
- A rota fica disponivel apenas para `professor` e `admin`

## Turmas

A rota protegida `/turmas` permite que professor/admin liste e cadastre ciclos da mentoria.

- Endpoint unico da funcionalidade: `/api/turmas`
- A listagem usa `GET /api/turmas`
- O cadastro usa `POST /api/turmas`
- A view chama `src/controllers/classes.controller.js`
- O model `src/models/classes.model.js` normaliza nome, data de inicio, data de fim e status
- O service `src/services/classes.service.js` concentra a chamada ao endpoint
- O formulario valida nome, datas obrigatorias e impede data final anterior a inicial
- A lista exibe nome, periodo e status
- Nao existe logica de pontuacao nesta funcionalidade

## Desafios

A rota protegida `/desafios` permite que professor/admin liste e cadastre desafios disponiveis aos alunos.

- Endpoint unico da funcionalidade: `/api/desafios`
- A listagem usa `GET /api/desafios`
- O cadastro usa `POST /api/desafios`
- A view chama `src/controllers/challenges.controller.js`
- O model `src/models/challenges.model.js` normaliza pilar, titulo, descricao, pontos, tipo, maximo de participantes e status
- O service `src/services/challenges.service.js` concentra a chamada ao endpoint
- O formulario carrega pilares pela API para vincular o desafio ao topico correto
- O formulario valida pontuacao fixa maior que zero
- Desafios em grupo ou ambos aceitam no maximo 5 participantes
- A tela nao calcula pontuacao por dificuldade

## Configuracoes

A rota protegida `/configuracoes` permite que professor/admin consulte parametros iniciais da aplicacao.

- Endpoint unico da funcionalidade: `GET /api/configuracoes`
- A view chama `src/controllers/configurations.controller.js`
- O model `src/models/configurations.model.js` normaliza parametros, visibilidade do ranking e flags de leitura/edicao
- O service `src/services/configurations.service.js` concentra a chamada ao endpoint
- A tela e somente leitura quando a API nao informa suporte de edicao
- Ranking geral para alunos aparece como permitido, indisponivel ou nao informado conforme retorno da API
- Estado vazio orienta quando nao houver configuracoes disponiveis
- Senhas, tokens, chaves e segredos nao sao exibidos

## Aprovacoes

A rota protegida `/aprovacoes` permite que professor/admin avalie envios pendentes.

- Endpoint unico da funcionalidade: `/api/envios-desafios/aprovacoes`
- A listagem usa `GET /api/envios-desafios/aprovacoes`
- A avaliacao usa `PATCH /api/envios-desafios/aprovacoes`
- A view chama `src/controllers/challenge-approvals.controller.js`
- O model `src/models/challenge-approvals.model.js` normaliza aluno, desafio, descricao, evidencias, pontos, status e feedback
- O service `src/services/challenge-approvals.service.js` concentra a chamada ao endpoint
- A tela exibe evidencias como texto ou link aberto pelo usuario, sem baixar arquivos automaticamente
- Aprovar delega a atribuicao automatica de pontos para a API REST
- Solicitar ajuste exige feedback minimo antes da chamada HTTP

## Grupos

A rota protegida `/grupos` permite que professor/admin consulte grupos formados em envios coletivos.

- Endpoint unico da funcionalidade: `GET /api/grupos`
- A view chama `src/controllers/groups.controller.js`
- O model `src/models/groups.model.js` normaliza envio, lider, participantes, turma, pontos e status
- O service `src/services/groups.service.js` concentra a chamada ao endpoint
- A tela lista envio, lider/responsavel, participantes e status
- Detalhes exibem ate 5 participantes vinculados
- A primeira versao e apenas consulta e nao altera grupos ou status
- E-mails, senha, token e dados sensiveis dos alunos nao sao exibidos

## Meus grupos

A rota protegida `/meus-grupos` permite que o aluno consulte seus desafios enviados em grupo.

- Endpoint unico da funcionalidade: `GET /api/grupos/meus`
- A view chama `src/controllers/groups.controller.js` pelo fluxo `getMyGroups`
- O model `src/models/groups.model.js` normaliza desafio, pilar, responsavel, participantes, status, pontos e ranking
- O service `src/services/groups.service.js` concentra a chamada ao endpoint do aluno
- A tela lista apenas grupos em que o aluno autenticado e responsavel ou participante
- Pontos concedidos aparecem somente quando o status do envio e `aprovado`
- Envios pendentes, reprovados ou em ajuste mostram que a pontuacao ainda nao entrou no ranking
- Estado vazio orienta o aluno quando ainda nao existem grupos vinculados

## Registro de desafio

A rota protegida `/registrar-desafio` permite que o aluno envie um desafio realizado para avaliacao.

- Endpoint unico da funcionalidade: `POST /api/envios-desafios`
- A view chama `src/controllers/challenge-submission.controller.js`
- O model `src/models/challenge-submission.model.js` valida pilar, desafio, turma, tipo, descricao, evidencia e participantes
- O service `src/services/challenge-submission.service.js` concentra a chamada ao endpoint
- O seletor de pilar carrega as opcoes cadastradas na API por `GET /api/pilares`
- Envios em grupo aceitam ate 5 participantes informados no formulario
- O aluno autenticado permanece como responsavel pelo envio pela sessao JWT
- A confirmacao exibida apos sucesso indica status `pendente`
- Pontuacao concedida nao e exibida antes da aprovacao

## Meus desafios

A rota protegida `/meus-desafios` lista o historico de envios do aluno autenticado.

- Endpoint unico da funcionalidade: `GET /api/envios-desafios/meus`
- A view chama `src/controllers/my-challenge-submissions.controller.js`
- O model `src/models/my-challenge-submissions.model.js` normaliza desafio, pilar, data, tipo, status, evidencias e feedback
- O service `src/services/my-challenge-submissions.service.js` concentra a chamada ao endpoint
- Status validos aparecem com texto claro: `Pendente`, `Aprovado`, `Reprovado` e `Ajuste solicitado`
- Detalhes do envio exibem descricao, evidencias e feedback do professor quando existir
- A tela nao permite alterar status

## Minha pontuacao

A rota protegida `/minha-pontuacao` lista a pontuacao do aluno autenticado.

- Endpoint unico da funcionalidade: `GET /api/pontuacoes/minha`
- A view chama `src/controllers/my-score.controller.js`
- O model `src/models/my-score.model.js` normaliza total, pontos por pilar e historico sem recalcular pontuacao no front-end
- O service `src/services/my-score.service.js` concentra a chamada ao endpoint
- Pontos por pilar usam os 7 topicos do Metodo do Alavanque como agrupamento visual
- Historico exibe motivo, pontos, data e envio relacionado quando disponivel
- Estado vazio orienta o aluno a registrar desafios para gerar novas avaliacoes

## Ranking

A rota protegida `/ranking` lista o ranking geral da mentoria.

- Endpoint unico da funcionalidade: `GET /api/ranking`
- A view chama `src/controllers/ranking.controller.js`
- O model `src/models/ranking.model.js` normaliza posicao, aluno, pontos e dados minimos para identificar o usuario atual
- O service `src/services/ranking.service.js` concentra a chamada ao endpoint
- A posicao do usuario autenticado recebe destaque visual e texto acessivel
- O front-end nao recalcula posicoes nem pontos; apenas exibe os dados consolidados pela API
- Quando a API indicar indisponibilidade, a tela exibe mensagem simples sem detalhes tecnicos

## Meu perfil

A rota protegida `/perfil` exibe dados cadastrais do usuario autenticado.

- Endpoint unico da funcionalidade: `GET /api/users/me`
- A view chama `src/controllers/profile.controller.js`
- O model `src/models/profile.model.js` normaliza nome, e-mail, perfil, status e turmas
- O service `src/services/profile.service.js` concentra a chamada ao endpoint
- Dados sensiveis como senha, token e segredos nao entram no DTO nem na view
- A rota fica disponivel para `aluno`, `professor` e `admin`
- Sessao invalida e tratada pelo cliente HTTP e pelo guard de rotas, redirecionando para login

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
