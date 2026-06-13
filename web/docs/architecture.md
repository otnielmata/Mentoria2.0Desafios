# Arquitetura MVC moderna no Next.js

A aplicacao web do Desafios Mentoria 2.0 segue uma adaptacao MVC para Next.js, mantendo as convencoes do framework e separando responsabilidades para permitir evolucao por User Stories.

## Camadas

```text
src/
  app/          Rotas, layouts e composicao de paginas com App Router
  views/        Views de tela, responsaveis pela interface
  components/   Componentes visuais reutilizaveis
  controllers/  Acoes de tela, validacao e orquestracao de chamadas
  models/       DTOs, normalizacoes e validacoes de contratos
  services/     Integracao com API REST, sessao e adaptadores externos
  config/       Configuracoes compartilhadas da aplicacao
```

## Responsabilidades

- `app/`: define rotas e compoe paginas. Deve delegar interface detalhada para views ou components.
- `views/`: renderiza telas e recebe dados, estados e handlers por propriedades.
- `components/`: concentra UI reutilizavel sem conhecer URLs, endpoints ou regras da API.
- `controllers/`: recebe dados da View, chama Models para validar/normalizar e aciona Services.
- `models/`: guarda contratos, transformacoes e validacoes usadas pelo front-end.
- `services/`: isola chamadas HTTP, sessao local e integracoes externas.

## Fluxo exemplo: login

```text
src/app/login/page.js
  -> src/views/auth/LoginView.js
  -> src/controllers/auth.controller.js
  -> src/models/auth.model.js
  -> src/services/auth.service.js
  -> src/services/api/client.js
```

Neste fluxo, a View cuida da interface do formulario, o Controller orquestra a acao de login, o Model valida o DTO e o Service encapsula a comunicacao com a API REST.

## Regra de acoplamento

Componentes visuais e Views nao montam URLs da API manualmente. Contratos externos, endpoints e adaptadores ficam centralizados em `services/` para reduzir acoplamento com a API REST.
