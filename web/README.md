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
    components/      # Componentes visuais reutilizaveis
    config/          # Configuracoes compartilhadas de layout e navegacao
    controllers/     # Orquestracao das acoes das telas
    models/          # Validacoes e contratos de entrada
    services/        # Integracao com API REST e sessao local
```

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

## Layout e navegacao

O layout base separa rotas publicas e autenticadas pelo `AppShell`.

- Rotas publicas exibem somente navegacao publica, tema e conteudo da tela
- Rotas autenticadas exibem navegacao principal filtrada por perfil
- Menus estao preparados para aluno, professor e admin
- Navegacao mobile usa menu responsivo sem sobrepor a area principal
- `GlobalFeedback` reserva uma regiao global para mensagens e loading
- Regras de navegacao ficam em `src/config/navigation.js`

## Integracao com a API

A aplicacao web nao acessa o MongoDB diretamente. O banco, a autenticacao JWT e as regras de negocio permanecem na API REST. A web consome os endpoints por meio de `NEXT_PUBLIC_API_BASE_URL` e armazena o token JWT localmente para chamadas autenticadas.
