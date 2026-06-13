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

## Listagem de heuristicas

A tela `Heuristicas` implementa a MR-53 como uma area protegida e usa somente o endpoint:

```text
GET /api/heuristicas
```

A tela exige token de autenticacao, redireciona para login quando nao ha sessao valida, preserva a ordenacao recebida da API e apresenta estados de carregamento, erro com tentativa de recarregar, lista vazia e lista carregada com titulo e descricao.

## Integracao com a API

A aplicacao web nao acessa o MongoDB diretamente. O banco, a autenticacao JWT e as regras de negocio permanecem na API REST. A web consome os endpoints por meio de `NEXT_PUBLIC_API_BASE_URL` e armazena o token JWT localmente para chamadas autenticadas.
