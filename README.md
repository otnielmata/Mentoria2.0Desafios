# Mentoria API - Método do Alavanque

API REST consolidada para controlar desafios executados por alunos no Método do Alavanque, pontuar ações aprovadas e gerar rankings, dashboards e relatórios.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Swagger (`swagger-ui-express` + `yamljs`)

## Arquitetura de pastas

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
  contrato-web-api.md
  swagger.yaml
web/
  src/
    contracts/
    controllers/
    lib/
    models/
    views/
```

## Configuração de ambiente

1. Copie o exemplo:

```bash
cp .env.example .env
```

2. Ajuste as variáveis:

- `NODE_ENV`
- `PORT`
- `BASE_URL`
- `MONGODB_URI`
- `DATABASE_URL` (alternativa aceita)
- `MONGO_URL` (alternativa aceita)
- `MONGO_URI` (alternativa aceita)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `RANKING_HIDE_INACTIVE_STUDENTS`

## Instalação

```bash
npm install
```

## Scripts

- `npm run dev`: inicia com `nodemon` e reinicia automaticamente a cada alteração
- `npm start`: inicia em modo estático
- `npm test`: executa testes unitários com Jest
- `npm run test:contract`: valida o contrato entre menus/telas da Web e endpoints reais da API

## Endpoints principais

- `GET /api/health`
- `GET /api/health/protected` (requer JWT)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/usuarios/registro` e `POST /api/usuarios/login` (aliases MR-1/MR-2)
- `GET /api/me` e `PATCH /api/me` (nome e senha do próprio perfil; turma, status e perfil são administrativos)
- `GET /api/users/me` (perfil autenticado consumido pela Web)
- `POST /api/users`, `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id` e `DELETE /api/users/:id` (admin)
- `POST /api/heuristicas` e `GET /api/heuristicas`
- `POST /api/alunos`, `POST /api/alunos/importar`, `GET /api/alunos`, `GET /api/alunos/:id`, `PATCH /api/alunos/:id`, `DELETE /api/alunos/:id`
- `POST /api/turmas`, `GET /api/turmas`, `GET /api/turmas/:id`, `PATCH /api/turmas/:id`, `DELETE /api/turmas/:id`
- `POST /api/turmas/:turmaId/alunos` e `DELETE /api/turmas/:turmaId/alunos/:alunoId`
- `POST /api/pilares`, `GET /api/pilares`, `GET /api/pilares/:id`, `PATCH /api/pilares/:id`, `DELETE /api/pilares/:id`
- `POST /api/desafios`, `GET /api/desafios`, `GET /api/desafios/:id`, `PATCH /api/desafios/:id`, `DELETE /api/desafios/:id`
- `POST /api/desafios/:id/inscricoes` e `GET /api/desafios/inscricoes/minhas`
- `POST /api/envios-desafios`, `GET /api/envios-desafios/meus`, `GET /api/me/envios-desafios`, `GET /api/envios-desafios/:id`
- `PATCH /api/envios-desafios/:id`, `PUT /api/envios-desafios/:id/participantes`, `DELETE /api/envios-desafios/:id`
- `GET /api/envios-desafios/aprovacoes`, `PATCH /api/envios-desafios/aprovacoes`, `GET /api/admin/envios-desafios/pendentes`
- `PATCH /api/admin/envios-desafios/:id/avaliacao`
- `GET /api/grupos`, `GET /api/grupos/meus` e `PATCH /api/grupos/:id/contato`
- `GET /api/pontuacoes/minha`, `GET /api/me/pontuacoes` e `POST /api/pontuacoes/extras`
- `GET /api/ranking`, `GET /api/ranking/admin`, `GET /api/rankings` e `GET /api/rankings/geral`
- `GET /api/dashboard/aluno`, `GET /api/me/dashboard`, `GET /api/dashboard/admin` e `GET /api/admin/dashboard`
- `GET /api/relatorios/participacao`, `GET /api/admin/relatorios/participacao`, `GET /api/relatorios/alunos/pilares`, `GET /api/admin/relatorios/alunos/pilares`, `GET /api/relatorios/grupos-desafios` e `GET /api/admin/relatorios/grupos-desafios`
- `GET /api/admin/relatorios/baixa-participacao`
- `GET /api/auditorias` e `GET /api/admin/auditorias`
- `GET /api/configuracoes`
- `GET /api/eventos-ao-vivo`, `POST /api/eventos-ao-vivo`, `GET /api/eventos-ao-vivo/:id`, `PATCH /api/eventos-ao-vivo/:id` e `DELETE /api/eventos-ao-vivo/:id` (admin)
- `GET /api/plano-estudo/agenda`, `GET /api/plano-estudo/itens`, `POST /api/plano-estudo/itens`, `PATCH /api/plano-estudo/itens/:id` e `DELETE /api/plano-estudo/itens/:id` (aluno)
- `GET /api/docs` (Swagger UI)

Rotas administrativas exigem JWT válido e perfil `professor` ou `admin`. Rotas do aluno exigem JWT válido e perfil `aluno`; a API continua sendo a autoridade final de autorização, mesmo quando a Web filtra menus visualmente.

## Fluxo Web do aluno

A tela inicial da Web permite login ou inscrição pública como aluno. A inscrição pública usa `POST /api/auth/register`, não oferece seleção de perfil e cria o usuário sempre com perfil `aluno` e status `ativo`. Professor só deve ser definido em fluxo administrativo.

O menu do aluno exibe `Início`, `Plano de Estudo`, `Desafios`, `Meus Grupos`, `Minha Pontuação` e `Meu Perfil`. Todos os itens consomem endpoints reais da API.

Em `Plano de Estudo`, o aluno visualiza uma agenda mensal no estilo calendário. Eventos cadastrados pelo administrador/professor para a turma aparecem em camadas de leitura (`ao_vivo`, `modulo_gravado`, `conteudo_especial`) e não podem ser editados pelo aluno. O aluno pode criar, editar e excluir apenas itens pessoais de planejamento na própria agenda.

No `Início`, a Web exibe nome do aluno, posição no ranking, pontuação total, quantidade de desafios ativos e gráfico de pizza com a distribuição percentual de desafios aprovados por pilar do Método do Alavanque, usando `GET /api/dashboard/aluno`.

Em `Meu Perfil`, o aluno pode alterar nome completo e senha. Turma, status e perfil aparecem apenas como dados de leitura para o aluno e só devem ser alterados por administrador/professor em rotas administrativas.

Em `Desafios`, o aluno primeiro se inscreve em um desafio ativo. A API cria ou completa automaticamente um grupo do mesmo desafio e turma até atingir `maxParticipantes`, quantidade definida pelo professor/admin no cadastro do desafio. Depois da inscrição, o aluno envia a entrega selecionando um desafio inscrito; turma, tipo e participantes são preenchidos pela API a partir do grupo. O envio aceita descrição, evidência/link e anexo.

Em `Meus Grupos`, o aluno vê os integrantes do grupo automático e qualquer participante pode informar ou atualizar o link de contato do grupo (`whatsapp`, `telegram` ou `discord`) para combinar a execução do desafio.

## Fluxo Web do professor/admin

O menu administrativo exibe `Dashboard`, `Alunos`, `Turmas`, `Pilares`, `Desafios`, `Plano de Estudo`, `Aprovações`, `Grupos`, `Ranking`, `Relatórios` e, para usuários com perfil `admin`, `Configurações`.

Em `Plano de Estudo`, professor/admin cadastra a agenda oficial da mentoria por turma: aulas ao vivo, liberação de módulos gravados e conteúdos com convidado especial. A tela usa visão mensal semelhante a um calendário e permite filtrar por turma e tipo de evento.

Em `Alunos`, professor/admin pode cadastrar alunos, importar alunos em lote por CSV, editar nome, e-mail, senha, status, turma e a marcação se o aluno entrou no Discord. A lista exibe 10 registros por página, permite filtrar por parte do nome, editar e excluir o aluno por soft delete. A inscrição pública continua criando apenas usuários com perfil `aluno`; perfis de professor devem ser administrados fora desse cadastro público.

O CSV de importação em lote de alunos deve conter as colunas `Nome`, `E-mail`, `Senha Inicial` e `Turma`. A turma informada precisa existir e pode ser localizada por nome, código ou ID.

Em `Turmas`, professor/admin pode cadastrar, listar, filtrar por parte do nome, editar e excluir turmas. A listagem exibe 10 registros por página e substitui a visualização antiga de alunos por turma.

Em `Pilares`, professor/admin pode cadastrar, editar, inativar e reativar pilares do método. A listagem exibe 10 registros por página e permite filtrar por parte do nome do pilar.

Em `Dashboard`, a Web exibe alunos ativos, quantidade de desafios enviados, aprovações pendentes, ranking dos 10 primeiros alunos e gráfico de pizza com o percentual de desafios aprovados por pilar.

Em `Desafios`, o cadastro permite selecionar um ou mais pilares do Método do Alavanque, informando a pontuação de cada pilar selecionado. Também inclui limite de entrega, quantidade de participantes do grupo e `Pontos apresentação ao vivo`. A lista exibe 10 registros por página, permite filtrar por parte do título e oferece `Editar`, `Ativar`/`Desativar` e `Apagar` o desafio pela ação administrativa.

Em `Aprovações`, professor/admin visualiza descrição, evidências, anexos, desafio, turma e participantes do envio. A lista exibe 10 registros por página, permite filtrar por nome de aluno/participante ou título do desafio e consultar pendentes, aprovados, reprovados, ajustes ou todos. Ao aprovar, a API lança a pontuação para todos os integrantes do grupo. Se a opção de apresentação ao vivo for marcada, a pontuação extra cadastrada no desafio é somada para todos os participantes aprovados.

Em `Ranking`, a Web lista todos os alunos rankeados por pontuação total e quantidade de desafios executados.

Em `Configurações`, o administrador faz a gestão geral de usuários e perfis do sistema. A tela exibe 10 registros por página e permite filtrar por nome/e-mail, perfil e status, cadastrar usuários com perfil `aluno`, `professor` ou `admin`, visualizar a listagem, editar nome, e-mail, senha, status e perfil, além de excluir usuários por soft delete.

## Contrato Web/API

A Web mantém a lista centralizada de endpoints consumidos em `web/src/contracts/api-endpoints.js`. Cada item informa funcionalidade, tela, menu, método, rota, perfis permitidos e se o endpoint é futuro. Endpoints marcados como futuros precisam ter justificativa explícita e não podem ser tratados como funcionalidade pronta no menu.

O teste `npm run test:contract` cruza essa lista com as rotas Express registradas na API e com o Swagger. Se uma tela consumir endpoint inexistente, a falha aponta a tela, o menu, o método e a rota divergente.

O cliente HTTP da Web em `web/src/lib/api-client.js` trata `404` como funcionalidade indisponível, exibindo mensagem amigável sem limpar sessão. Apenas erros reais de autenticação, como `401`, devem acionar fluxo de encerramento de sessão.

Mais detalhes ficam em `docs/contrato-web-api.md`.

## Configurações funcionais

`GET /api/configuracoes` retorna configurações funcionais do MVP para professor/admin em modo somente leitura. A resposta informa ranking geral para alunos, ocultação opcional de alunos inativos no ranking, modelo de pontuação fixa, bônus por liderança desligado, desafios recorrentes ativos com limite por período e conquistas/badges/medalhas como evolução futura.

O endpoint não expõe segredos técnicos, tokens, URI de banco, chaves privadas ou variáveis sensíveis. A Web transforma esse contrato em visualização somente leitura pelos módulos `web/src/controllers/configuration.controller.js`, `web/src/models/configuration.model.js` e `web/src/views/configuration.view.js`.

## Pilares padrão

Ao conectar no MongoDB, a API executa um seed idempotente dos 7 pilares do Método do Alavanque:

- Conhecimento Técnico Alinhado ao Mercado
- Posicionamento e Softskills
- Prática
- Exposição a Problemas
- Compartilhamento
- Networking
- Visibilidade

## Pontuação

O modelo usa pontuação fixa por desafio, distribuída por pilar. Ao cadastrar ou editar um desafio, professor/admin deve informar `pilares` como lista de itens `{ pilarId, points }`, com valor maior que zero para cada pilar selecionado. A API soma esses valores em `points` para manter compatibilidade com ranking, aprovação e telas existentes.

O campo `difficulty` pode existir como metadado legado, mas não substitui a pontuação fixa obrigatória do cadastro administrativo.

A pontuação principal é gerada pelo fluxo de aprovação de envio válido, no serviço de pontuação da API, e é registrada na coleção `pontuacoes` com referência ao aluno, desafio, envio aprovado e distribuição de pontos por pilar. Professor/admin também pode lançar pontos extras em `POST /api/pontuacoes/extras`, vinculando aluno, pilar, quantidade de pontos e motivo.

Em envios individuais, o aluno responsável recebe os pontos fixos do desafio. Em envios em grupo, o responsável e todos os participantes ativos recebem a mesma pontuação. Bônus de liderança é tratado como configuração futura/opcional e não é aplicado implicitamente.

`GET /api/pontuacoes/minha`, `GET /api/ranking` e `GET /api/ranking/admin` consideram pontuações vinculadas a envios com status `aprovado` e lançamentos extras cadastrados por professor/admin; envios pendentes, reprovados ou em ajuste não somam pontos.

Desafios podem ser configurados como recorrentes por professor/admin usando `recorrencia.enabled`, `recorrencia.periodo` (`diario`, `semanal` ou `mensal`) e `recorrencia.limitePontos`. Quando a soma dos pontos já concedidos ao aluno naquele desafio e período ultrapassar o limite, a API bloqueia a aprovação com erro de integridade antes de gerar nova pontuação.

## Auditoria

A API registra eventos de auditoria para criação de envio, avaliação do professor/admin e geração de pontuação. Esses eventos ficam na coleção `auditorias` e mantêm vínculo com aluno, desafio, envio, turma, pontuação, status anterior/novo, feedback e data do evento.

Professor/admin pode consultar o histórico em `GET /api/auditorias` ou `GET /api/admin/auditorias`, com filtros por evento, aluno, ator, desafio, envio, turma e período. As respostas não expõem senha, token, hash ou segredos.

## Dashboards e relatórios

Os dashboards e relatórios são consolidados pela API para que a Web apenas exiba os dados.

- `GET /api/dashboard/aluno`: retorna pontos totais, ranking do aluno, quantidade de desafios ativos, resumo de envios por status, desafios aprovados, pendências, evolução por categoria/pilar e últimos envios.
- `GET /api/dashboard/admin`: retorna alunos ativos, quantidade de desafios ativos, envios totais, aprovações pendentes, ranking, rankings por turma/pilar e métricas de participação.
- `GET /api/relatorios/participacao`: retorna filtros/período, totais por status, distribuição de pontos aprovados, participação por aluno, participação por turma e baixa participação quando `diasSemEnvio` ou `pontuacaoMinima` forem informados.
- `GET /api/relatorios/alunos/pilares`: retorna relatório paginado por aluno com total de pontos, quebra por pilar e detalhes de cada lançamento, incluindo data, professor/admin responsável, origem e pontuação.
- `GET /api/relatorios/grupos-desafios`: retorna relatório paginado dos grupos por desafio, com título do desafio, integrantes, turma, se o grupo está formado, se já foi enviado para aprovação e o status atual do envio.

As respostas não expõem senha, token, hash ou segredos; os serviços usam apenas campos públicos dos alunos.

## Coleções principais

- `users`: alunos, professores e administradores, incluindo a marcação administrativa `discordJoined`
- `auth_attempts`: auditoria básica de tentativas inválidas de login
- `auditorias`: eventos de domínio auditáveis
- `heuristicas`: diretrizes cadastradas por usuários autenticados
- `turmas`: turmas da mentoria
- `alunos_turmas`: vínculo histórico entre alunos e turmas
- `pilares`: tópicos do Método do Alavanque
- `desafios`: desafios cadastrados com um ou mais pilares, pontos por pilar, tipo, limite de participantes e status
- `inscricoes_desafios`: inscrição do aluno em desafio ativo e vínculo com grupo
- `grupos_desafios`: grupos automáticos formados por desafio/turma com contato do grupo
- `envios_desafios`: registros enviados pelos alunos
- `participantes_envio`: participantes ativos/removidos de envios em grupo
- `pontuacoes`: histórico de pontos concedidos após aprovação
- `eventos_ao_vivo`: agenda oficial da mentoria por turma (somente leitura para alunos)
- `plano_estudo_itens`: planejamento pessoal do aluno

## Regras consolidadas

- Apenas alunos registram envios de desafios.
- Antes de enviar uma entrega, o aluno deve estar inscrito no desafio e vinculado a um grupo automático.
- O professor/admin cadastra descrição, um ou mais pilares com pontuação individual, data limite de entrega e quantidade de participantes por grupo.
- Ao se inscrever, o aluno escolhe a modalidade normal ou inglês e entra em um grupo aberto do mesmo desafio/turma/modalidade, ou inicia um novo grupo automaticamente.
- Grupos normais e grupos de inglês são formados separadamente; alunos de modalidades diferentes nunca são misturados no mesmo grupo.
- A data limite é inclusiva; após o fim do dia cadastrado, o desafio é inativado automaticamente e deixa de aceitar novas inscrições.
- Depois da inscrição, o botão da modalidade escolhida permanece visível como `Inscrito`, desabilitado para impedir nova inscrição.
- O formulário de envio lista somente desafios em que o aluno está inscrito e que permanecem ativos.
- `Meus desafios enviados` mantém o histórico completo dos envios feitos pelos grupos do aluno; envios ligados a desafios inativos ficam visíveis, mas bloqueados para edição.
- O grupo é marcado como completo quando atinge a quantidade de participantes definida no desafio.
- Participantes do grupo podem atualizar o link de contato do grupo para WhatsApp, Telegram ou Discord.
- Envios começam com status `pendente`.
- Descrição é obrigatória; evidência/link e anexo são opcionais.
- Quando um integrante do grupo envia o desafio, todos os integrantes passam a visualizar o envio em `Meus desafios enviados` e podem editar enquanto estiver pendente ou em ajuste.
- Depois de aprovado, o envio fica bloqueado para edição e a pontuação é computada para os integrantes do grupo.
- Anexos podem ser enviados junto da entrega e ficam registrados no envio.
- Envios em grupo usam participantes em coleção própria e mantêm array legado para compatibilidade.
- Grupo registra o aluno responsável como líder do envio e aceita até 5 participantes, respeitando o limite definido no desafio.
- Participantes de grupo não podem ser duplicados e devem estar ativos na mesma turma.
- Professor/admin pode aprovar, reprovar ou solicitar ajuste.
- Ao aprovar, a API gera pontuação para responsável e participantes ativos, usando a soma dos pontos dos pilares selecionados no desafio.
- A aprovação bloqueia pontuação duplicada quando a mesma evidência já pontuou o mesmo desafio para o mesmo aluno.
- Rankings geral, por pilar, por turma, por período e por tipo usam a mesma origem de pontuações aprovadas.
- Desafios recorrentes podem limitar a soma de pontos por aluno dentro de um período diário, semanal ou mensal.
- Criação de envio, avaliação e geração de pontuação registram eventos de auditoria pela API.
- Dashboards e relatórios são métricas consolidadas da API; a Web não recalcula pontuação, ranking, participação ou baixa participação.
- Menus e telas da Web devem consumir somente endpoints existentes no contrato Web/API ou endpoints marcados explicitamente como futuros.
- Erro `404` em endpoint consumido pela Web deve ser exibido como funcionalidade indisponível, sem confundir com expiração de sessão.
- Usuários inativos não podem fazer login.
- Alunos são desativados por soft delete (`status: inativo`), preservando envios, pontuações e vínculos históricos.
- Usuários excluídos em Configurações também são inativados por soft delete; o administrador autenticado não pode excluir a própria conta.

## Cobertura consolidada MR-1 a MR-49

Esta branch consolida os contratos das User Stories MR-1 a MR-49 e os ajustes das MR-92/MR-98: autenticação, perfil, heurísticas, alunos, turmas, pilares fixos, desafios com pontuação fixa, recorrência com limite por período, envios com descrição obrigatória e evidência/anexo opcionais, grupos com líder, aprovações com bloqueio de duplicidade quando houver evidência, pontuação automática somente após aprovação, auditoria de domínio, contrato Web/API, configurações funcionais somente leitura, rankings baseados em pontos aprovados, dashboards e relatórios consolidados pela API, coleções relacionais (`alunos_turmas` e `participantes_envio`) e seed idempotente dos 7 pilares padrão.

## Próximos passos planejados

- Ampliar a documentação Swagger com exemplos detalhados de todos os contratos
- Configurar CI com GitHub Actions
- Configurar deploy na Vercel
