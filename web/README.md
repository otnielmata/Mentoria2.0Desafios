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
  src/
    app/             # Views e rotas do Next.js
    views/           # Views de tela
    components/      # Componentes visuais reutilizaveis
    controllers/     # Orquestracao das acoes das telas
    models/          # Validacoes e contratos de entrada
    services/        # Integracao com API REST e sessao local
```

## MVC moderno no Next.js

A aplicacao adapta MVC para o App Router:

- `app/`: rotas, layouts e composicao das paginas
- `views/`: interface de telas especificas
- `components/`: UI reutilizavel
- `controllers/`: acoes de tela e orquestracao
- `models/`: DTOs, normalizacoes e validacoes
- `services/`: integracao com API REST e adaptadores

O fluxo de login em `src/app/login/page.js` demonstra a separacao: a rota compoe a tela, `src/views/auth/LoginView.js` renderiza a interface, `src/controllers/auth.controller.js` orquestra a acao, `src/models/auth.model.js` valida os dados e `src/services/auth.service.js` isola a API.

Veja mais detalhes em `web/docs/architecture.md`.

## Configuracao

1. Copie o exemplo de ambiente:

```bash
cp web/.env.example web/.env.local
```

2. Ajuste a URL da API REST:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Instalar dependencias

```bash
cd web
npm install
```

## Scripts

- `npm run dev`: inicia a aplicacao em modo desenvolvimento, reiniciando quando arquivos forem alterados
- `npm start`: inicia a aplicacao em modo estatico/producao depois do build
- `npm run build`: gera a versao de producao
- `npm test`: executa testes unitarios da camada web

## Telas iniciais

- Inicio
- Login
- Registrar usuario
- Dashboard
- Heuristicas

## Integracao com a API

A aplicacao web nao acessa o MongoDB diretamente. O banco, a autenticacao JWT e as regras de negocio permanecem na API REST. A web consome os endpoints por meio de `NEXT_PUBLIC_API_BASE_URL` e armazena o token JWT localmente para chamadas autenticadas.
