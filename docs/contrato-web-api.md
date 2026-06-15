# Contrato Web/API

A API é a fonte de verdade para regras de negócio, pontuação, ranking, engajamento e auditoria. A Web deve consumir endpoints reais declarados no contrato central em `web/src/contracts/api-endpoints.js`.

## Regras

- Cada tela ou menu que consome dados precisa apontar para um endpoint existente na API.
- Endpoints ainda não disponíveis devem ficar marcados como `future: true`, com `futureReason` explicando o motivo.
- A Web não deve calcular pontuação, ranking, participação ou baixa participação para compensar ausência de endpoint.
- A Web deve exibir configurações funcionais de `GET /api/configuracoes` em modo somente leitura enquanto não existir endpoint seguro de edição.
- Funcionalidades futuras, como badges e medalhas, podem aparecer como planejadas, mas não como ativas.
- Resposta `404` representa funcionalidade indisponível ou rota divergente, não expiração de sessão.
- O cliente HTTP da Web deve preservar a sessão em `404` e limpar sessão apenas em erro de autenticação real, como `401`.

## Validação

O teste de contrato cruza a lista central da Web com as rotas Express reais. Quando uma tela usar rota inexistente, a falha aponta tela, menu, método e endpoint divergente.

```bash
npm run test:contract
```

## Manutenção

Ao criar ou alterar endpoint consumido pela Web:

1. Atualize a rota da API.
2. Atualize o Swagger em `docs/swagger.yaml`.
3. Atualize o contrato em `web/src/contracts/api-endpoints.js`.
4. Execute `npm run test:contract`.
