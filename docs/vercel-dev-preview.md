# Ambiente Dev Independente no Vercel

Esta branch foi preparada para um deploy independente da `main`, com:

- URL própria de preview no Vercel
- banco separado no MongoDB Atlas
- API e Web apontando para o mesmo ambiente dev

## Branch sugerida

- `codex/dev-vercel-preview`

Quando esta branch for enviada para o GitHub, a Vercel deve gerar uma Preview Deployment com link exclusivo.

## Banco dev separado

Crie um banco separado no mesmo cluster Atlas, por exemplo:

- `mentoria_api_dev`

## Clonar a base oficial para a base dev

Use o script do projeto:

```bash
SOURCE_MONGODB_URI='mongodb://.../mentoria_api?...' \
TARGET_MONGODB_URI='mongodb://.../mentoria_api_dev?...' \
TARGET_MONGODB_DB_NAME='mentoria_api_dev' \
npm run db:clone:dev
```

Se a URI de destino não trouxer o nome do banco, mantenha `TARGET_MONGODB_DB_NAME`.

## Variáveis no projeto Preview do Vercel

Defina estas variáveis no ambiente `Preview`:

- `APP_ENV=preview`
- `BASE_URL=https://SEU-LINK-DEV.vercel.app`
- `MONGODB_URI=<URI do banco dev>`
- `MONGODB_DB_NAME=mentoria_api_dev`
- `JWT_SECRET=<segredo do ambiente dev>`
- `JWT_EXPIRES_IN=1d`

Opcional:

- `NEXT_PUBLIC_API_BASE_URL=` vazio, para a Web usar o próprio domínio publicado

## Validação

Depois do deploy, valide:

- `https://SEU-LINK-DEV.vercel.app/api/health`

O resultado esperado deve mostrar algo como:

- `config.appEnv = "preview"`
- `config.gitBranch = "codex/dev-vercel-preview"`
- `database.name = "mentoria_api_dev"`
- `database.status = "connected"`
