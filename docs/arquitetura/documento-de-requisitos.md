# Documento de Requisitos

## Sistema de Gestão e Consulta de Horários Escolares

**Instituição:** Colégio Estadual Presidente Kennedy
**Sistema:** Horários Escolares
**Versão do documento:** 1.0
**Data:** 08/11/2026
**Status:** baseline da versão 1 (modelo Client-Only)
**Responsável pela consolidação:** Arquiteto de Software
**Validação:** responsável do projeto

> **Nota de localização:** o destino canônico deste documento é
> `docs/requisitos/Documento_de_requisitos.md`. Ele foi criado em `docs/arquitetura/`
> porque a política de escrita deste agente permite apenas essa área. A movimentação para
> `docs/requisitos/` deve ser feita pelo responsável com permissão de escrita.

---

## Controle de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 08/11/2026 | Consolidação dos requisitos aprovados e implementados na v1, com rastreabilidade para ADRs, modelo de dados, regras e código. | Arquiteto |

---

## Como ler este documento

Este documento é a **fonte de verdade dos requisitos** do Sistema de Gestão e Consulta de
Horários Escolares. Ele consolida o que foi aprovado nos artefatos de arquitetura
(`docs/arquitetura/`), nas decisões arquiteturais (ADR-01 a ADR-08) e no código da versão 1.

### Legenda de situação

| Situação | Significado |
|---|---|
| **Entregue** | Implementado e disponível na versão 1. |
| **Parcial** | Implementado em parte; a lacuna está descrita no próprio requisito ou nos riscos. |
| **Planejado** | Requisito aprovado ou proposto, mas fora da versão 1. |
| **Fora do escopo** | Deliberadamente não contemplado na versão 1. |
| **Proposto** | Ideia registrada, sem aprovação para implementação. |

### Legenda de prioridade

| Prioridade | Critério |
|---|---|
| **Obrigatório** | Sem ele o sistema não cumpre o objetivo principal. |
| **Importante** | Agrega valor relevante, mas não bloqueia o uso básico. |
| **Desejável** | Evolução prevista, sem impacto no uso atual. |

### Convenções de identificação

| Prefixo | Significado |
|---|---|
| `RF` | Requisito funcional |
| `NFR` | Requisito não funcional |
| `RN` | Regra de negócio |
| `ADR` | Decisão arquitetural registrada |
| `LAC` | Lacuna herdada dos requisitos |
| `RISCO` | Risco técnico identificado |
| `PERM` | Regra de permissão/perfil |
| `ARC` | Componente arquitetural |
| `ENT` | Entidade de domínio |
| `FL` | Fluxo de dados |

> **Preservação de identificadores:** os números `RF01`–`RF58` e `NFR-02` são os já citados
> nos artefatos aprovados. Faixas cuja granularidade original não está disponível no
> repositório foram consolidadas como macro-requisitos, sem renumerar nem criar novos
> identificadores conflitantes.

---

# 1. Introdução

## 1.1 Contexto

O Colégio Estadual Presidente Kennedy organiza suas aulas em uma grade semanal com turmas do
ensino médio e do ensino técnico, no período da manhã. A grade envolve professores,
disciplinas, turmas, dias da semana, períodos de aula e intervalos. Hoje, a informação
circula em planilhas, documentos e comunicações informais, o que dificulta a consulta
rápida por alunos e professores e a manutenção segura pela secretaria.

O projeto nasce de uma necessidade real do colégio: **disponibilizar o horário escolar de
forma centralizada, confiável e acessível**, ao mesmo tempo em que oferece à administração
um meio controlado de atualizar cadastros e aulas sem gerar conflitos ou perder o registro
das alterações.

## 1.2 Problema

| Problema | Consequência |
|---|---|
| Horários dispersos em planilhas e documentos | Alunos e professores consultam versões desatualizadas. |
| Alterações sem registro de autoria e data | Não há rastreabilidade nem possibilidade de auditoria. |
| Edição manual sem validação de conflitos | Um professor pode ser alocado em duas turmas no mesmo horário. |
| Dependência de uma pessoa para responder consultas | Sobrecarga da secretaria e demora no atendimento. |
| Acesso apenas presencial ou por arquivo | Dificuldade de consulta no celular e fora da escola. |
| Exclusão de cadastros sem critério | Risco de aulas apontando para professores, disciplinas ou turmas inexistentes. |

## 1.3 Solução proposta

Uma aplicação web **responsiva, instalável como PWA e acessível online**, que:

1. autentica usuários com Google ou e-mail/senha;
2. permite consultar horários por turma e por professor;
3. permite favoritar turmas e receber notificações de alterações;
4. oferece à administração o cadastro de professores, disciplinas e turmas;
5. permite editar a grade semanal com validação de conflitos;
6. permite configurar períodos, duração das aulas e intervalo;
7. registra as alterações em histórico auditável;
8. preserva os dados históricos mesmo após arquivamento ou exclusão de cadastros.

A versão 1 adota o modelo **Client-Only**: React + TypeScript consomem diretamente Firebase
Authentication e Cloud Firestore, com regras de segurança no Firestore. Não há Cloud
Functions no deploy atual.

## 1.4 Escopo da versão 1

### 1.4.1 Dentro do escopo

| Área | Entregue na v1 |
|---|---|
| Acesso | Login com Google, login/cadastro com e-mail e senha, recuperação de senha, sessão e logout. |
| Perfil | Criação automática de perfil com papel padrão `aluno`; leitura do próprio perfil. |
| Consulta | Horários por turma, aulas por professor, grade semanal e detalhes de cada aula. |
| Personalização | Favoritos de turmas por usuário. |
| Notificações | Listagem das notificações do usuário e marcação como lida. |
| Administração | Painel com indicadores e atalhos por perfil. |
| Cadastros | Criar, editar, arquivar, reativar, consultar arquivados e excluir professores, disciplinas e turmas. |
| Grade | Criar, editar, remover e trocar aulas entre slots da mesma turma. |
| Configuração | Abertura, fechamento, períodos, duração das aulas e intervalo. |
| Auditoria | Histórico de alterações com antes/depois, responsável e data. |
| PWA | Manifesto, ícones, service worker, instalação e cache do shell. |
| Publicação | Build estático publicado no Render e código versionado no GitHub. |
| Modo demonstração | Dados locais em `localStorage`, sem Firebase, para avaliação e testes. |

### 1.4.2 Fora do escopo da versão 1

| Item | Motivo |
|---|---|
| Assistente de IA com Gemini | Depende de Cloud Functions, segredo de servidor e cotas; registrado como RF10 planejado. |
| Edição em massa de aulas | Depende de operação transacional server-side; registrada como RF23–RF30 planejada. |
| Geração automática de notificações | Depende de fan-out server-side; a v1 apenas exibe e marca notificações. |
| Salas e alocação física | Bloqueado por LAC-23/LAC-24; RF54–RF56 propostos. |
| Gestão de usuários pela interface | RF58 proposto; a atribuição de papéis é operacional. |
| Calendário escolar e aulas futuras | LAC-14 aberta; a v1 não distingue aula futura de aula passada. |
| Aplicativo nativo para Android/iOS | A PWA cobre instalação e uso em dispositivos. |
| Integração com sistemas acadêmicos externos | Sem requisito aprovado. |

## 1.5 Premissas

1. A identidade do usuário é sempre do Firebase Authentication; o perfil no Firestore é
   derivado e não concede privilégio por si só.
2. A escola opera em turno único da manhã (D-02), com seis períodos e um intervalo.
3. A grade é semanal e se repete enquanto não houver alteração.
4. O horário de cada aula é derivado da configuração global, não gravado na aula.
5. A administração é exercida por `admin` e `gestor`; a configuração de horários é
   exclusiva do `gestor`.
6. O acesso à aplicação é autenticado; não há consulta pública anônima.
7. O deploy do front-end é independente da publicação de regras e índices do Firestore.
8. Nenhum segredo (chave Gemini, service account) é embutido no cliente.

## 1.6 Restrições

| Restrição | Impacto |
|---|---|
| Firestore limita transações/batches a 500 operações | Edição em massa limitada a 200 aulas. |
| Documento do Firestore limitado a ~1 MiB | Dados são distribuídos em coleções; não há documento monolítico. |
| Render Static Site não executa lógica de servidor | Autorização depende do Firebase Auth e das regras do Firestore. |
| Regras e índices têm release próprio | O deploy do front-end não publica segurança de dados. |
| Firebase Auth exige domínios autorizados | O domínio do Render precisa estar na lista antes do go-live. |
| PWA com service worker pode reter versão antiga | `sw.js` é servido com `no-cache` e o cache é versionado. |
| Sem suíte automatizada de testes configurada | A validação da v1 é manual e baseada em checklist. |

## 1.7 Definições e siglas

| Termo | Definição |
|---|---|
| **Aula** | Ocupação de um slot semanal por uma disciplina e um professor em uma turma. |
| **Slot** | Combinação de turma, dia da semana e período. |
| **Período** | Faixa de tempo de uma aula, definida na configuração. |
| **Intervalo** | Pausa entre períodos, sem aula associada. |
| **Turma** | Agrupamento de alunos com grade própria. |
| **Modalidade** | Ensino Médio ou Ensino Técnico. |
| **PWA** | Progressive Web App: aplicação web instalável, com manifesto e service worker. |
| **SPA** | Single Page Application: aplicação de página única com roteamento no cliente. |
| **Claims** | Informações do token de identidade do Firebase Auth. |
| **Client-Only** | Modelo em que o cliente acessa o banco diretamente, sem camada de funções. |
| **Regras do Firestore** | Regras declarativas que autorizam ou negam leitura e escrita. |
| **Histórico** | Registro imutável de alterações, com antes/depois, autor e data. |
| **Baseline** | Conjunto de requisitos congelado como referência de uma versão. |

## 1.8 Referências documentais

| Documento | Papel |
|---|---|
| `docs/arquitetura/visao-geral.md` | Componentes, fronteiras de confiança e deploy. |
| `docs/arquitetura/modelo-dados-firestore.md` | Coleções, campos, índices e ciclo de vida. |
| `docs/arquitetura/seguranca-regras.md` | Modelo de ameaças e matriz de acesso. |
| `docs/arquitetura/integracoes.md` | Contratos de dados e fluxos. |
| `docs/arquitetura/decisoes/ADR-01.md` a `ADR-08.md` | Decisões arquiteturais. |
| `docs/arquitetura/analise-impacto.md` | Impactos, riscos e rollback. |
| `docs/arquitetura/testes-fluxo-operacional.md` | Roteiro de testes manuais da v1. |
| `docs/arquitetura/deploy-render.md` | Operação e checklist de publicação. |
| `firestore.rules` | Regras vigentes do Firestore. |
| `firestore.indexes.json` | Índices vigentes. |
| `src/types/dominio.ts` | Contratos de domínio do front-end. |
| `src/services/contratos.ts` | Interfaces dos serviços. |

---

# 2. Objetivos

## 2.1 Objetivo geral

Centralizar a gestão e a consulta dos horários escolares do Colégio Estadual Presidente
Kennedy em uma aplicação web responsiva, instalável e segura, garantindo que alunos,
professores e administração tenham acesso à informação atualizada e que toda alteração seja
validada e rastreável.

## 2.2 Objetivos específicos

| ID | Objetivo | Critério de sucesso |
|---|---|---|
| O1 | Reduzir o tempo de consulta ao horário | Usuário localiza a grade da turma ou do professor em até 3 interações. |
| O2 | Eliminar conflitos de alocação | Nenhuma aula publicada com professor em duas turmas no mesmo dia/período. |
| O3 | Dar autonomia controlada à secretaria | `admin` mantém cadastros e grade sem depender de desenvolvedor. |
| O4 | Preservar a memória das alterações | 100% das escritas de domínio geram registro de histórico. |
| O5 | Garantir acesso em qualquer dispositivo | Interface funcional de 320 px a 1920 px e instalável como PWA. |
| O6 | Proteger dados e privilégios | Nenhum usuário consegue se autoatribuir papel administrativo. |
| O7 | Manter custo e operação sustentáveis | Publicação estática no Render e uso do plano gratuito/inicial do Firebase. |
| O8 | Preparar evolução para IA | Modelo de dados e contratos compatíveis com o assistente planejado (RF10). |

## 2.3 Indicadores de sucesso

| Indicador | Meta da v1 | Forma de verificação |
|---|---|---|
| Cobertura de turmas cadastradas | 100% das turmas atendidas pela escola | Conferência com a secretaria. |
| Cobertura de professores e disciplinas | 100% dos envolvidos na grade | Conferência com a grade oficial. |
| Conflitos de professor publicados | 0 | Teste negativo e revisão da grade. |
| Alterações com histórico | 100% | Inspeção da coleção `historico`. |
| Consulta em dispositivo móvel | 100% dos fluxos críticos utilizáveis | Teste em viewport de 360 px. |
| Instalação como PWA | Disponível em Chrome/Edge e Android | Teste de instalação e auditoria do manifest. |
| Disponibilidade percebida | ≥ 99% ao mês | Monitoramento do Render e do Firebase. |
| Tempo de carregamento inicial | ≤ 3 s em 4G | Medição com Lighthouse. |
| Acessibilidade | Fluxos críticos navegáveis por teclado | Checklist WCAG 2.1 AA (parcial). |

## 2.4 Alinhamento com o problema

| Problema | Objetivo | Requisitos relacionados |
|---|---|---|
| Horários dispersos | O1 | RF11, RF12, RF14, RF15 |
| Falta de rastreabilidade | O4 | RF17–RF22, RF30, RF40, RF53 |
| Conflitos de alocação | O2 | RF31–RF35 |
| Dependência da secretaria | O3 | RF04–RF08, RF48–RF53 |
| Acesso restrito a desktop | O5 | NFR-13, NFR-17, NFR-20 |
| Risco de privilégio indevido | O6 | RF03, NFR-01, NFR-03 |
| Custo operacional | O7 | NFR-21, NFR-24 |
| Evolução para IA | O8 | RF10, ADR-07 |

---

# 3. Público-alvo

## 3.1 Perfis de usuário

| Perfil | Descrição | Necessidade principal | Acesso |
|---|---|---|---|
| **Aluno** | Estudante matriculado em uma turma. | Consultar o horário da própria turma e de professores. | Consulta, favoritos, notificações. |
| **Professor** | Docente que ministra aulas em uma ou mais turmas. | Consultar sua agenda semanal e a grade das turmas. | Mesmo acesso inicial do aluno; sem administração. |
| **Administrador** | Secretaria ou coordenação com papel `admin`. | Manter cadastros, grade e consultar histórico. | Painel administrativo, exceto configuração de horários. |
| **Gestor principal** | Responsável máximo pela configuração do sistema. | Administrar tudo, incluindo períodos e papéis. | Acesso administrativo completo. |
| **Novo usuário** | Pessoa autenticada que ainda não possui perfil. | Entrar e obter acesso de consulta. | Perfil automático como `aluno`. |
| **Equipe de TI** | Responsável por deploy, regras e índices. | Publicar, monitorar e recuperar o sistema. | Acesso operacional fora da aplicação. |

> **Professor na v1:** o professor tem o mesmo acesso inicial do aluno. A distinção de papel
> existe no modelo, mas não há funcionalidade exclusiva de professor nesta versão.

## 3.2 Necessidades por perfil

### Aluno
- saber quais aulas ocorrem em cada dia e período;
- identificar disciplina e professor de cada aula;
- favoritar a própria turma para acesso rápido;
- ser avisado quando a grade da turma favorita mudar;
- instalar a aplicação no celular.

### Professor
- consultar a própria agenda semanal;
- consultar a grade das turmas em que leciona;
- verificar disciplina, turma e horário de cada aula;
- acessar pelo celular, inclusive com pouca conectividade.

### Administração
- cadastrar e manter professores, disciplinas e turmas;
- editar a grade com segurança e sem conflitos;
- arquivar registros que não devem mais ser usados;
- excluir cadastros somente quando não houver dependências;
- consultar o histórico de alterações;
- identificar rapidamente inconsistências.

### Gestor principal
- definir abertura, fechamento, quantidade e duração das aulas;
- definir o intervalo;
- garantir que a configuração não invalide aulas existentes;
- administrar papéis de usuário (RF58, planejado).

## 3.3 Matriz de permissões resumida

| Operação | Aluno | Professor | Admin | Gestor |
|---|---|---|---|---|
| Entrar e consultar o próprio perfil | Sim | Sim | Sim | Sim |
| Consultar turmas, professores e aulas | Sim | Sim | Sim | Sim |
| Favoritar turmas | Sim | Sim | Sim | Sim |
| Ler e marcar as próprias notificações | Sim | Sim | Sim | Sim |
| Acessar o painel administrativo | Não | Não | Sim | Sim |
| Criar/editar professores, disciplinas e turmas | Não | Não | Sim | Sim |
| Arquivar, reativar e excluir cadastros | Não | Não | Sim | Sim |
| Editar a grade semanal | Não | Não | Sim | Sim |
| Configurar períodos, duração e intervalo | Não | Não | Não | Sim |
| Consultar o histórico | Não | Não | Sim | Sim |
| Conceder/revogar papel administrativo | Não | Não | Não | Sim (RF58) |
| Executar edição em massa | Não | Não | Sim (planejado) | Sim (planejado) |
| Usar o assistente de IA | Sim (planejado) | Sim (planejado) | Sim (planejado) | Sim (planejado) |

## 3.4 Jornadas típicas

### Jornada 1 — Aluno consulta a grade
1. Acessa a aplicação e entra com Google ou e-mail/senha.
2. O sistema cria ou recupera o perfil com papel `aluno`.
3. O aluno abre “Horários por turma”.
4. Seleciona a turma.
5. Visualiza a grade semanal com disciplina, professor e horário.
6. Opcionalmente favorita a turma.

### Jornada 2 — Professor consulta a própria agenda
1. Entra na aplicação.
2. Abre “Aulas por professor”.
3. Seleciona o próprio nome.
4. Visualiza a grade semanal com turma, disciplina e horário.

### Jornada 3 — Secretaria altera uma aula
1. Entra com perfil `admin`.
2. Abre “Editar horários”.
3. Seleciona a turma e a célula.
4. Escolhe disciplina e professor.
5. O sistema valida referências ativas e conflitos.
6. A alteração é gravada com histórico.
7. Usuários que favoritaram a turma são notificados (planejado).

### Jornada 4 — Gestor altera a configuração
1. Entra com perfil `gestor`.
2. Abre “Configurar aulas”.
3. Altera abertura, períodos, duração ou intervalo.
4. O sistema valida a coerência e impede remover período em uso.
5. A configuração é salva com histórico; as aulas passam a exibir os novos horários.

### Jornada 5 — Administração arquiva um cadastro
1. Abre o cadastro do professor, disciplina ou turma.
2. Solicita arquivamento.
3. Se houver aula vinculada, o sistema bloqueia e informa as aulas.
4. Sem vínculo, o cadastro vai para “Arquivados”.
5. O histórico registra a operação.

## 3.5 Fora do público-alvo da v1

- responsáveis e familiares;
- candidatos e visitantes anônimos;
- órgãos externos;
- integrações com sistemas de terceiros.

---

# 4. Requisitos funcionais

## 4.1 Convenções

- Cada requisito tem identificador estável, descrição objetiva, prioridade e situação.
- A coluna **Evidência** indica onde o requisito está implementado ou documentado.
- Requisitos marcados como **Planejado** não fazem parte da entrega da v1 e dependem de
  decisão/aprovação específica.
- Requisitos marcados como **Parcial** têm a lacuna explicitada.

## 4.2 Acesso, identidade e perfil

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF01** | Permitir autenticação com Google e com e-mail/senha, incluindo cadastro de nova conta e recuperação de senha. | Obrigatório | Entregue | `src/features/auth/`, ARC-02 |
| **RF02** | Criar automaticamente o perfil do usuário no primeiro acesso, com papel padrão `aluno`, sem permitir que o cliente escolha o próprio papel. | Obrigatório | Entregue | `users/{uid}`, `firestore.rules` |
| **RF03** | Aplicar papéis `aluno`, `professor`, `admin` e `gestor`, garantindo menor privilégio e impedindo autoatribuição de privilégios. | Obrigatório | Parcial | Papel padrão e rotas protegidas; atribuição de papéis é operacional. RF58 planejado. |
| **RF08** | Disponibilizar painel administrativo com indicadores e atalhos, exibindo apenas as operações permitidas ao perfil. | Importante | Entregue | `src/features/painel/PainelPage.tsx`, `AppShell` |

### Critérios de aceitação — acesso

- [ ] Login com Google conclui e cria sessão.
- [ ] Login com e-mail/senha válido conclui e cria sessão.
- [ ] Cadastro com e-mail novo cria conta e perfil `aluno`.
- [ ] Recuperação de senha envia instrução para o e-mail informado.
- [ ] Usuário sem perfil recebe um perfil `aluno`; nunca `admin` ou `gestor`.
- [ ] Rota administrativa acessada por aluno/professor exibe acesso negado.
- [ ] Logout encerra a sessão e descarta favoritos/notificações em memória.

## 4.3 Cadastros de professores, disciplinas e turmas

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF04** | Permitir criar, consultar, editar, arquivar, reativar e excluir professores. | Obrigatório | Entregue | `CadastrosAdminPage`, `ArquivadosPage` |
| **RF05** | Permitir criar, consultar, editar, arquivar, reativar e excluir disciplinas, preservando os nomes da fonte oficial. | Obrigatório | Entregue | `CadastrosAdminPage` |
| **RF06** | Permitir criar, consultar, editar, arquivar, reativar e excluir turmas, com nome, série, modalidade e turno. | Obrigatório | Entregue | `CadastrosAdminPage`, `turmas` |
| **RF48** | Permitir editar os dados de um cadastro existente, com validação de campos e unicidade. | Obrigatório | Entregue | `salvarCadastro` |
| **RF49** | Permitir arquivar cadastros e consultá-los em uma seção “Arquivados”. | Importante | Entregue | `ArquivadosPage`, `alterarStatusCadastro` |
| **RF50** | Permitir reativar um cadastro arquivado, sem exigência de dependências. | Importante | Entregue | `alterarStatusCadastro` |
| **RF51** | Permitir excluir definitivamente um cadastro arquivado e sem aulas vinculadas. | Importante | Parcial | `excluirCadastro`; verificação de vínculo só no modo demonstração |
| **RF52** | Bloquear arquivamento e exclusão quando existir aula vinculada, informando as aulas impedidas. | Obrigatório | Parcial | ADR-06; bloqueio de exclusão apenas no modo demonstração (ver 8.6) |
| **RF53** | Preservar no histórico o identificador, o nome e o snapshot completo do cadastro excluído. | Obrigatório | Entregue | `historico.alteracao.antes`, `entidadeNome` |

### Critérios de aceitação — cadastros

- [ ] Nome vazio ou composto apenas por espaços é rejeitado.
- [ ] Nome duplicado no mesmo tipo de cadastro é bloqueado (comportamento presente no modo demonstração; pendente de validação no modo Firebase).
- [ ] Turma exige nome, série e modalidade válida.
- [ ] Arquivar cadastro com aula vinculada é bloqueado com mensagem clara.
- [ ] Reativar cadastro arquivado o devolve às listas ativas.
- [ ] Excluir cadastro não arquivado é bloqueado.
- [ ] Excluir cadastro com aula vinculada é bloqueado.
- [ ] Após excluir, o histórico mantém o snapshot e o nome.
- [ ] Operações de cadastro geram histórico com autor e data.

> **Divergência atual (modo Firebase):** o serviço permite arquivar cadastro com aulas
> vinculadas e não exige status `arquivado` nem ausência de aulas para excluir. O modo
> demonstração bloqueia a exclusão com aulas, mas não o arquivamento. A ADR-06 e as regras
> RN-22/RN-24 precisam ser aplicadas no serviço e nas regras antes de considerar RF51/RF52
> entregues.

## 4.4 Consulta de horários

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF11** | Permitir consultar o horário semanal de uma turma, com dia, período, disciplina, professor e horário de início/fim. | Obrigatório | Entregue | `ConsultaTurmasPage`, `TurmaHorarioPage` |
| **RF12** | Permitir consultar as aulas de um professor, com turma, disciplina, dia, período e horário. | Obrigatório | Entregue | `ConsultaProfessoresPage`, `ProfessorHorarioPage` |
| **RF14** | Exibir a grade semanal da turma em formato de tabela legível, com dias e períodos. | Obrigatório | Entregue | `GradeSemanal` |
| **RF15** | Permitir navegar entre turmas e professores sem perder o contexto de consulta. | Importante | Entregue | `AppShell`, rotas |
| **RF41** | Derivar e exibir o horário real de início e fim de cada aula a partir da configuração vigente. | Obrigatório | Entregue | `validacaoHorarios`, conversores |
| **RF42** | Exibir o intervalo entre períodos e impedir que ele seja tratado como período de aula. | Importante | Entregue | `ConfiguracaoHorarios` |

### Critérios de aceitação — consulta

- [ ] A grade exibe todos os dias letivos da semana (segunda a sexta).
- [ ] A grade exibe todos os períodos configurados.
- [ ] Slot vago é exibido como “Sem aula definida”, sem erro.
- [ ] Cada aula exibe disciplina, professor e horário.
- [ ] A consulta funciona em viewport de 360 px sem rolagem horizontal da página.
- [ ] Turma sem aulas exibe estado vazio compreensível.
- [ ] A grade do professor lista apenas aulas dele.
- [ ] Horários exibidos refletem a configuração mais recente.

## 4.5 Favoritos e notificações

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF09** | Permitir favoritar e desfavoritar turmas, listando os favoritos do próprio usuário. | Importante | Entregue | `ContextoFavoritos`, `FavoritosPage` |
| **RF43** | Gerar notificação quando a grade de uma turma favorita for alterada. | Importante | Parcial | Exibição implementada; geração automática planejada |
| **RF44** | Entregar a notificação somente a usuários que favoritaram a turma afetada. | Importante | Planejado | Depende de fan-out server-side (ADR-05) |
| **RF45** | Listar as notificações do usuário, ordenadas da mais recente para a mais antiga. | Importante | Entregue | `NotificacoesPage`, `listarNotificacoes` |
| **RF46** | Permitir marcar uma notificação ou todas as notificações como lidas. | Importante | Entregue | `marcarNotificacaoLida`, `marcarTodasNotificacoesLidas` |
| **RF47** | Agrupar notificações de uma mesma operação em massa em um único aviso por usuário. | Desejável | Planejado | Depende de edição em massa |

### Critérios de aceitação — favoritos e notificações

- [ ] Favoritar a mesma turma duas vezes não cria duplicata.
- [ ] Favoritos são isolados por usuário.
- [ ] Desfavoritar remove o item da lista.
- [ ] Notificações são isoladas por usuário.
- [ ] Marcar como lida atualiza o contador de não lidas.
- [ ] Usuário não consegue ler nem alterar notificação de outro.
- [ ] Notificação inexistente ou expirada não quebra a tela.

## 4.6 Gestão de aulas e grade semanal

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF07** | Permitir criar, editar, remover e trocar aulas entre slots da mesma turma. | Obrigatório | Entregue | `HorariosAdminPage`, `salvarAula`, `trocarAulas` |
| **RF13** | Permitir edição individual de uma aula, escolhendo turma, dia, período, disciplina e professor. | Obrigatório | Entregue | Modal de edição da grade |
| **RF16** | Exigir disciplina e professor válidos e ativos para toda aula existente; slot vago não possui documento. | Obrigatório | Entregue | ADR-02, `aulas` |
| **RF31** | Impedir que um professor seja alocado em duas turmas no mesmo dia e período. | Obrigatório | Entregue | Validação de conflito |
| **RF32** | Impedir que uma turma tenha duas aulas no mesmo dia e período. | Obrigatório | Entregue | ID determinístico `${turmaId}_${diaSemana}_${periodo}` |
| **RF33** | Validar existência e status ativo de turma, disciplina e professor antes de gravar. | Obrigatório | Entregue | `salvarAula` |
| **RF34** | Bloquear a gravação quando houver conflito e apresentar os conflitos ao usuário. | Obrigatório | Entregue | Validação no serviço/UI |
| **RF35** | Garantir que a alteração de uma aula seja atômica em relação ao histórico. | Obrigatório | Entregue | `runTransaction` |

### Critérios de aceitação — aulas

- [ ] Criar aula em slot vago grava um único documento.
- [ ] Editar aula existente atualiza o documento e gera histórico.
- [ ] Remover aula exclui o documento e gera histórico.
- [ ] Alocar professor já ocupado no mesmo dia/período é bloqueado.
- [ ] Alocar disciplina/professor arquivado é bloqueado.
- [ ] Selecionar período inexistente na configuração é bloqueado.
- [ ] Trocar duas células da mesma turma preserva a consistência.
- [ ] Falha no meio da operação não deixa aula sem histórico.

## 4.7 Histórico e auditoria

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF17** | Registrar toda alteração de aula, cadastro e configuração em histórico. | Obrigatório | Entregue | Coleção `historico` |
| **RF18** | Registrar os valores anteriores e posteriores da alteração. | Obrigatório | Entregue | `alteracao.antes` / `alteracao.depois` |
| **RF19** | Registrar o responsável pela alteração (identificador, nome e e-mail). | Obrigatório | Entregue | `responsavelId`, `responsavelNome`, `responsavelEmail` |
| **RF20** | Registrar a data/hora da alteração com referência do servidor. | Obrigatório | Entregue | `serverTimestamp()` |
| **RF21** | Permitir consulta do histórico por administradores e gestores, com filtros e paginação. | Obrigatório | Parcial | `HistoricoPage`; regra vigente permite leitura a autenticados (ver 8.6) |
| **RF22** | Impedir edição e exclusão de registros de histórico. | Obrigatório | Entregue | `firestore.rules`; ADR-04 |

### Critérios de aceitação — histórico

- [ ] Criar/editar/remover aula gera registro com antes/depois.
- [ ] Criar/editar/arquivar/reativar/excluir cadastro gera registro.
- [ ] Alterar configuração gera registro.
- [ ] Registro contém autor, data e descrição.
- [ ] Não existe ação de editar ou excluir histórico na interface.
- [ ] Consulta exibe os registros mais recentes primeiro.
- [ ] Registros de exclusão preservam o snapshot do cadastro.

## 4.8 Configuração de horários

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF36** | Permitir configurar o horário de abertura e de fechamento do turno. | Importante | Entregue | `ConfiguracaoPage` |
| **RF37** | Permitir configurar a quantidade de períodos e o início/fim de cada aula. | Obrigatório | Entregue | `ConfiguracaoPage` |
| **RF38** | Permitir configurar um intervalo entre períodos, ou nenhum intervalo. | Importante | Entregue | `ConfiguracaoPage` |
| **RF39** | Validar a coerência da configuração: horários crescentes, sem sobreposição, dentro da abertura/fechamento e sem conflito com o intervalo. | Obrigatório | Entregue | `validacaoHorarios` |
| **RF40** | Impedir remover ou renumerar período que possua aulas e registrar a alteração no histórico. | Obrigatório | Entregue | Validação + histórico |

### Critérios de aceitação — configuração

- [ ] Abertura anterior ao fechamento é obrigatória.
- [ ] Períodos não podem se sobrepor.
- [ ] Período não pode invadir o intervalo.
- [ ] Remover período com aulas é bloqueado com lista de períodos em uso.
- [ ] Alteração de horário reflete em todas as aulas sem reescrever documentos.
- [ ] Apenas o gestor acessa a configuração.
- [ ] Salvar configuração gera histórico.

## 4.9 Edição em massa (planejada)

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF23** | Permitir filtrar aulas por turma, professor, disciplina, dia e período para seleção. | Importante | Planejado | ADR-03 |
| **RF24** | Permitir selecionar até 200 aulas para uma operação em massa. | Importante | Planejado | ADR-03 |
| **RF25** | Permitir definir alteração de professor e/ou disciplina para o conjunto selecionado. | Importante | Planejado | ADR-03 |
| **RF26** | Gerar prévia não destrutiva com o estado antes/depois de cada aula. | Obrigatório | Planejado | ADR-03 |
| **RF27** | Apresentar conflitos detectados antes da confirmação, sem aplicar alterações. | Obrigatório | Planejado | ADR-03 |
| **RF28** | Exigir confirmação explícita para aplicar a operação em massa. | Obrigatório | Planejado | ADR-03 |
| **RF29** | Aplicar a operação em massa de forma atômica, sem estado parcialmente aplicado. | Obrigatório | Planejado | ADR-03 |
| **RF30** | Registrar histórico individual por aula alterada e vínculo com a operação. | Obrigatório | Planejado | ADR-03 |

### Critérios de aceitação — edição em massa

- [ ] Seleção acima de 200 aulas é rejeitada sem escrita.
- [ ] Prévia não altera dados.
- [ ] Conflito impede a confirmação e lista os casos.
- [ ] Confirmação aplica todas as aulas ou nenhuma.
- [ ] Reenvio da mesma operação não duplica histórico.
- [ ] Cada aula alterada possui registro de histórico.
- [ ] Notificação agrupada é gerada após o commit (quando RF47 estiver implementado).

## 4.10 Assistente de IA (planejado)

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF10** | Permitir que o usuário autenticado faça perguntas em linguagem natural sobre turmas, professores, disciplinas e horários, recebendo resposta baseada apenas nos dados da escola. | Desejável | Planejado | ADR-07; D-01 |

### Critérios de aceitação — assistente

- [ ] A pergunta é enviada por função autenticada; a chave Gemini nunca chega ao cliente.
- [ ] O assistente consulta apenas dados de leitura permitidos.
- [ ] Não inventa horários, professores ou disciplinas.
- [ ] Responde que não encontrou quando o dado não existe.
- [ ] Respeita cotas por usuário/dia e por minuto.
- [ ] Indisponibilidade do provedor retorna erro seguro, sem resposta inventada.
- [ ] Pergunta e resposta não são persistidas em texto claro na v1.

## 4.11 Salas e recursos físicos (fora do escopo)

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF54** | Permitir cadastrar e editar salas. | Desejável | Fora do escopo | LAC-23/LAC-24 |
| **RF55** | Permitir arquivar salas e associá-las a aulas. | Desejável | Fora do escopo | LAC-23/LAC-24 |
| **RF56** | Permitir consultar a ocupação das salas. | Desejável | Fora do escopo | LAC-23/LAC-24 |

> O campo `salaId` existe como **reservado** no modelo de dados, mas não é gravado até que
> LAC-23/LAC-24 sejam decididas e uma ADR seja aprovada.

## 4.12 Gestão de administradores (proposta)

| ID | Requisito | Prioridade | Situação | Evidência |
|---|---|---|---|---|
| **RF58** | Permitir que o gestor principal conceda e revogue o papel de administrador, com registro em histórico. | Desejável | Proposto | LAC-03/RF58; contrato não definido |

> RF57 permanece **reservado** como proposta registrada em ADR-02, sem detalhamento
> aprovado. Não integra o escopo da v1.

## 4.13 Requisitos transversais de interface

| ID | Requisito | Prioridade | Situação |
|---|---|---|---|
| **RF-T01** | Exibir estados de carregamento, vazio e erro em todas as consultas. | Obrigatório | Entregue |
| **RF-T02** | Exibir mensagens de erro compreensíveis, sem detalhes técnicos sensíveis. | Obrigatório | Entregue |
| **RF-T03** | Confirmar ações destrutivas (arquivar, excluir, remover aula). | Obrigatório | Entregue |
| **RF-T04** | Preservar a rota e o contexto ao recarregar a página (hash routing). | Importante | Entregue |
| **RF-T05** | Informar o modo de dados (demonstração ou Firebase) quando aplicável. | Importante | Entregue |
| **RF-T06** | Permitir instalar a aplicação como PWA e avisar quando houver atualização. | Importante | Entregue |

---

# 5. Requisitos não funcionais

## 5.1 Segurança

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-01** | Aplicar menor privilégio em rotas, serviços e regras do Firestore. | 100% das rotas administrativas bloqueiam aluno/professor; nenhuma operação administrativa acessível por URL direta. | Entregue |
| **NFR-02** | Proteger dados pessoais e registrar apenas o necessário (LGPD). | Perfil contém somente `uid`, `email`, `displayName` e `role`; histórico não registra token, IP ou user-agent. | Entregue |
| **NFR-03** | Validar entradas no cliente e no servidor/regras; nunca confiar apenas na interface. | Teste negativo com escrita direta no Firestore é negado para perfil sem permissão. | Parcial — modelo Client-Only (RISCO-32) |
| **NFR-04** | Impedir autoatribuição de papel administrativo. | Cliente não consegue alterar `users/{uid}.role`; criação só aceita `role = aluno`. | Entregue |
| **NFR-05** | Não expor segredos no cliente. | Bundle e `.env.example` contêm apenas configuração pública `VITE_*`; nenhuma chave Gemini/service account. | Entregue |
| **NFR-06** | Aplicar cabeçalhos de segurança e HTTPS na hospedagem. | Resposta inclui HSTS, `nosniff`, `X-Frame-Options: DENY`, COOP adequado ao popup Google. | Entregue via Render |
| **NFR-07** | Isolar notificações e favoritos por usuário. | Consulta sem filtro de `uid` falha; usuário não lê dado de outro. | Entregue |

## 5.2 Desempenho e escalabilidade

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-08** | Carregar a aplicação em tempo aceitável em rede móvel. | LCP ≤ 3 s em 4G; bundle inicial compatível com SPA. | A verificar |
| **NFR-09** | Responder consultas de grade em tempo perceptível. | Consulta de turma/professor ≤ 1 s no percentil 95 em condições normais. | A verificar |
| **NFR-10** | Suportar o volume atual da escola. | 14 turmas, ~420 aulas semanais, 100 usuários simultâneos sem degradação relevante. | Entregue |
| **NFR-11** | Respeitar os limites do Firestore. | Nenhuma transação ultrapassa 500 operações; edição em massa limitada a 200 aulas. | Entregue (limite documentado) |
| **NFR-12** | Evitar consultas sem índice. | Consultas previstas cobertas por `firestore.indexes.json`. | Entregue |

## 5.3 Usabilidade, responsividade e acessibilidade

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-13** | Ser responsiva e mobile-first. | Fluxos críticos utilizáveis de 320 px a 1920 px, sem rolagem horizontal da página. | Entregue |
| **NFR-14** | Ter alvos de toque adequados. | Botões e células interativas com área mínima de 44 × 44 px em dispositivos móveis. | A verificar |
| **NFR-15** | Ser acessível por teclado e leitores de tela. | Fluxos críticos navegáveis por Tab; labels, `aria-*` e foco visível; contraste mínimo AA. | Parcial — auditoria pendente |
| **NFR-16** | Usar linguagem clara em português do Brasil. | Textos sem jargão técnico; mensagens orientam a próxima ação. | Entregue |

## 5.4 PWA e compatibilidade

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-17** | Ser instalável como PWA. | `manifest.webmanifest` válido, ícones 192/512, `display: standalone`, service worker registrado. | Entregue |
| **NFR-18** | Funcionar offline no shell estático. | Aplicação abre sem rede exibindo shell e mensagem de indisponibilidade de dados. | Entregue |
| **NFR-19** | Atualizar sem retenção indefinida de versão antiga. | `sw.js` com `Cache-Control: no-cache` e cache versionado; aviso de atualização na UI. | Entregue |
| **NFR-20** | Ser compatível com navegadores modernos. | Últimas duas versões de Chrome, Edge, Firefox e Safari; Android e iOS. | A verificar |

## 5.5 Disponibilidade, operação e custos

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-21** | Manter disponibilidade compatível com o uso escolar. | ≥ 99% ao mês, desconsiderando indisponibilidade do Firebase/Render. | A monitorar |
| **NFR-22** | Permitir rollback rápido de front-end. | Rollback pelo histórico do Render ou `git revert` em até 15 minutos. | Entregue |
| **NFR-23** | Separar release de front-end e de regras/índices. | Ordem documentada: índices → regras → front-end. | Entregue |
| **NFR-24** | Manter custo previsível. | Uso dentro do plano gratuito/inicial; cotas monitoradas; nenhuma função paga obrigatória na v1. | Entregue |
| **NFR-25** | Registrar erros sem dados sensíveis. | Mensagens ao usuário com código estável; logs sem token, senha ou conteúdo pessoal. | Parcial |

## 5.6 Manutenibilidade e testabilidade

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-26** | Usar TypeScript estrito e lint. | `npm run typecheck` e `npm run lint` sem erros. | Entregue |
| **NFR-27** | Separar UI, serviços e acesso a dados. | Nenhum componente de UI importa `firebase/firestore` diretamente. | Entregue |
| **NFR-28** | Ter contratos tipados e vocabulário único. | `src/types/dominio.ts` e `src/services/contratos.ts` como fonte; `camelCase` e coleções em português. | Entregue |
| **NFR-29** | Ser testável em validações críticas. | Validação de horários e conflitos isolada em funções puras. | Entregue |
| **NFR-30** | Ter documentação viva e rastreável. | Requisitos, ADRs, modelo de dados e deploy atualizados a cada mudança. | Entregue |
| **NFR-31** | Ter suíte automatizada de regressão. | Testes unitários, de regras e E2E executáveis em CI. | Pendente |

## 5.7 Localização e privacidade

| ID | Requisito | Critério verificável | Situação |
|---|---|---|---|
| **NFR-32** | Operar em português do Brasil e fuso `America/Sao_Paulo`. | Datas exibidas no fuso local; textos em pt-BR. | Entregue (LAC-21 pendente) |
| **NFR-33** | Tratar datas de forma consistente. | Persistência em `Timestamp`; payloads em ISO 8601; exibição localizada. | Entregue |
| **NFR-34** | Respeitar a privacidade de menores e titulares. | Apenas dados necessários; sem analytics invasivo; política de retenção documentada. | Parcial |

---

# 6. Regras de negócio

## 6.1 Identidade e acesso

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-01** | Todo usuário autenticado possui exatamente um perfil, identificado pelo `uid`. | RF02 | `users/{uid}` |
| **RN-02** | O papel padrão de um novo usuário é `aluno`; nenhum cliente pode criar perfil com outro papel. | RF02, RF03 | Regras do Firestore |
| **RN-03** | Somente o gestor principal pode conceder ou revogar papel administrativo. | RF03, RF58 | Planejado |
| **RN-04** | O professor possui, na v1, o mesmo acesso de consulta do aluno. | RF03 | Interface e regras |
| **RN-05** | A configuração de horários é exclusiva do gestor. | RF36–RF40 | Rota e interface |
| **RN-06** | O perfil no Firestore não concede privilégio por si só; a autorização é validada nas regras e na aplicação. | NFR-01, NFR-03 | Regras |

## 6.2 Estrutura da grade

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-07** | Existe no máximo uma aula por turma, dia da semana e período. | RF32, ADR-02 | ID `${turmaId}_${diaSemana}_${periodo}` |
| **RN-08** | Slot vago é representado pela ausência de documento; não existe aula vazia. | RF16, ADR-02 | Modelo de dados |
| **RN-09** | Toda aula exige turma, disciplina e professor existentes e ativos. | RF16, RF33 | Validação |
| **RN-10** | Um professor não pode estar em duas turmas no mesmo dia e período. | RF31 | Validação de conflito |
| **RN-11** | Os horários de início e fim são derivados da configuração, não persistidos na aula. | RF41, ADR-02 | Configuração |
| **RN-12** | A grade é semanal e se repete até que haja alteração. | RF11, RF12 | Modelo |
| **RN-13** | O turno da v1 é somente `manha`. | D-02 | `turmas.turno` |
| **RN-14** | Salas não são alocadas na v1; `salaId` é reservado. | LAC-23/LAC-24 | Modelo |

## 6.3 Alteração da configuração

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-15** | Abertura deve ser anterior ao fechamento. | RF36, RF39 | Validação |
| **RN-16** | Períodos não podem se sobrepor e devem caber na janela de funcionamento. | RF37, RF39 | Validação |
| **RN-17** | O intervalo não pode coincidir com períodos de aula. | RF38, RF39 | Validação |
| **RN-18** | Remover ou renumerar período que possua aulas é proibido. | RF40, ADR-02 | Validação |
| **RN-19** | Alterar a duração dos períodos reflete em todas as aulas sem reescrever documentos. | RF41, ADR-02 | Derivação |
| **RN-20** | Toda alteração de configuração gera histórico. | RF40 | Transação |

## 6.4 Ciclo de vida dos cadastros

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-21** | O ciclo de vida é `ativo` → `arquivado` → `excluído`. | RF48–RF53, ADR-06 | Cadastros |
| **RN-22** | Arquivar exige zero aulas vinculadas. | RF52, ADR-06 | Validação |
| **RN-23** | Reativar é permitido a qualquer momento, sem verificação de dependência. | RF50, ADR-06 | Cadastros |
| **RN-24** | Excluir exige cadastro arquivado e zero aulas vinculadas. | RF51, RF52, ADR-06 | Validação |
| **RN-25** | Excluir uma turma remove os favoritos dessa turma. | RF09, ADR-06 | Transação/limpeza |
| **RN-26** | A exclusão remove o documento do cadastro, mas preserva o histórico com snapshot. | RF53, ADR-06 | Histórico |

## 6.5 Histórico e auditoria

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-27** | O histórico é append-only: não há edição nem exclusão. | RF22, ADR-04 | Regras |
| **RN-28** | Todo registro contém tipo, entidade, autor, data e antes/depois. | RF17–RF20, ADR-04 | Schema |
| **RN-29** | O histórico é consultável apenas por `admin` e `gestor`. | RF21, ADR-04 | Rota/regra |
| **RN-30** | A exclusão de cadastro registra `depois = {}` e o snapshot completo em `antes`. | RF53, ADR-04 | Histórico |

## 6.6 Edição em massa

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-31** | Uma operação em massa atinge no máximo 200 aulas. | RF24, ADR-03 | Limite |
| **RN-32** | A operação é tudo-ou-nada: conflito ou erro não aplica nenhuma alteração. | RF29, ADR-03 | Transação |
| **RN-33** | A prévia não escreve e não substitui a validação da confirmação. | RF26, RF27, ADR-03 | Contrato |
| **RN-34** | A operação é idempotente por chave e hash do payload. | RF28, ADR-03 | Operação |
| **RN-35** | Cada aula alterada gera histórico individual. | RF30, ADR-03 | Transação |

## 6.7 Notificações e favoritos

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-36** | Um usuário pode favoritar uma turma no máximo uma vez. | RF09, ADR-05 | ID `{uid}_{turmaId}` |
| **RN-37** | Favoritos e notificações são visíveis apenas ao próprio usuário. | RF09, RF45, ADR-05 | Regras |
| **RN-38** | A notificação de alteração é enviada apenas a quem favoritou a turma afetada. | RF43, RF44, ADR-05 | Fan-out |
| **RN-39** | Uma operação em massa gera no máximo uma notificação por usuário. | RF47, ADR-05 | Agrupamento |
| **RN-40** | Notificações expiram em 180 dias. | ADR-05 | TTL |

## 6.8 Integridade e tratamento de exceções

| ID | Regra | Origem | Aplicação |
|---|---|---|---|
| **RN-41** | A escrita de domínio e o histórico correspondente ocorrem na mesma transação. | RF17, RF35 | `runTransaction`/`writeBatch` |
| **RN-42** | Falha de rede durante uma escrita não pode produzir estado parcial silencioso. | NFR-03 | Transação + mensagem |
| **RN-43** | Usuário autenticado sem perfil recebe tratamento de erro com nova tentativa, sem perder a sessão. | RF02 | Interface |
| **RN-44** | Sessão expirada redireciona para login com mensagem clara. | RF01 | Interface |
| **RN-45** | Nenhuma exclusão ou alteração de privilégio é feita diretamente pelo cliente. | NFR-01, NFR-03 | Regras/procedimento |
| **RN-46** | O modo demonstração usa `localStorage` e nunca grava no Firebase. | Escopo | `src/services/demo/` |

---

# 7. Tecnologias

## 7.1 Stack da versão 1

| Camada | Tecnologia | Versão | Uso | Justificativa |
|---|---|---|---|---|
| Interface | React | 19.2 | Componentes e estado da SPA. | Stack aprovada; ecossistema e tipagem. |
| Linguagem | TypeScript | 5.9 | Tipagem estrita no front-end. | Contratos claros e menos erros em tempo de execução. |
| Build | Vite | 7.2 | Dev server e build estático. | Build rápido e saída estática compatível com Render. |
| Autenticação | Firebase Authentication | 12.4 | Google, e-mail/senha, recuperação e sessão. | Identidade gerenciada e integrada ao Firestore. |
| Banco de dados | Cloud Firestore | 12.4 | Persistência de perfis, catálogo, aulas, histórico, favoritos e notificações. | NoSQL documental, tempo real, regras de segurança e PWA offline. |
| Regras | Firestore Security Rules | v2 | Autorização de leitura/escrita. | Autoridade de segurança no banco. |
| Índices | Firestore Indexes | — | Consultas compostas. | Desempenho e ordenação. |
| PWA | Manifest + Service Worker próprio | — | Instalação, cache do shell e atualização. | Sem dependência adicional; controle do cache. |
| Hospedagem | Render Static Site | — | Publicação do `dist/`, TLS, CDN e headers. | ADR-08; SPA estática sem servidor. |
| Versionamento | Git + GitHub | — | Código, histórico e deploy contínuo. | Requisito de entrega. |
| Qualidade | ESLint + typescript-eslint | 9.x / 8.x | Análise estática. | Padronização e prevenção de erros. |
| Modo local | `localStorage` | — | Dados de demonstração. | Permite avaliar sem Firebase. |
| IA (planejada) | Gemini API / Google AI Studio | `google/gemini-3.1-flash-lite` | Assistente em linguagem natural. | D-01; somente via servidor. |
| Funções (planejadas) | Firebase Cloud Functions | — | Operações sensíveis, fan-out e IA. | Necessárias para RF10, RF23–RF30 e RF47. |

> **Observação:** a pasta `functions/` não existe no estado atual. Cloud Functions, Gemini e
> Secret Manager pertencem ao modelo server-side histórico (ADR-01 a ADR-07) e não fazem
> parte do deploy da v1.

## 7.2 Dependências e decisões de não adoção

| Item | Decisão | Motivo |
|---|---|---|
| Biblioteca de roteamento (React Router) | Não adotada | Hash routing próprio é suficiente e evita dependência. |
| Biblioteca de estado global | Não adotada | Contextos React cobrem o escopo. |
| `vite-plugin-pwa` | Não adotado | Service worker e manifest próprios atendem à v1. |
| Framework CSS | Não adotado | CSS próprio com tokens e componentes. |
| Cloud Functions | Não adotadas na v1 | Modelo Client-Only; reintrodução exige ADR. |
| Test runner | Não configurado | Lacuna registrada em NFR-31. |

## 7.3 Modelo de dados — visão resumida

| Coleção | Finalidade | Chave | Acesso do cliente |
|---|---|---|---|
| `users` | Perfil derivado da identidade. | `uid` | Leitura do próprio; criação limitada a `aluno`. |
| `professores` | Cadastro de docentes. | auto-ID / `prof-<slug>` | Leitura autenticada; escrita administrativa. |
| `disciplinas` | Cadastro de disciplinas. | auto-ID / `disc-<slug>` | Leitura autenticada; escrita administrativa. |
| `turmas` | Cadastro de turmas. | auto-ID / `turma-<slug>` | Leitura autenticada; escrita administrativa. |
| `aulas` | Slot semanal de aula. | `${turmaId}_${diaSemana}_${periodo}` | Leitura autenticada; escrita administrativa. |
| `configuracao` | Parâmetros globais de horário. | `atual` | Leitura autenticada; escrita do gestor. |
| `historico` | Auditoria imutável. | auto-ID | Leitura administrativa; criação na escrita; sem update/delete. |
| `favoritos` | Turmas favoritas por usuário. | `${uid}_${turmaId}` | Somente o próprio usuário. |
| `notificacoes` | Avisos por usuário. | auto-ID / determinístico | Leitura e marcação de leitura do próprio usuário. |
| `salas` | Reservada para evolução. | — | Fechada na v1. |

Detalhamento completo: `docs/arquitetura/modelo-dados-firestore.md`.

## 7.4 Decisões arquiteturais relacionadas

| ADR | Tema | Status |
|---|---|---|
| ADR-01 | Schema canônico em camelCase e coleções em português. | Aprovada |
| ADR-02 | ID determinístico da aula e horários derivados da configuração. | Aprovada |
| ADR-03 | Edição em massa com limite de 200 aulas e atomicidade. | Aprovada |
| ADR-04 | Histórico único, append-only e auditável. | Aprovada |
| ADR-05 | Notificações com TTL e favoritos diretos. | Aprovada |
| ADR-06 | Ciclo de vida e exclusão segura de cadastros. | Aprovada |
| ADR-07 | Assistente Gemini com ferramentas allowlist e cotas. | Aprovada |
| ADR-08 | Publicação do front-end como Static Site no Render. | Proposta |

## 7.5 Ambientes

| Ambiente | Dados | Autenticação | Uso |
|---|---|---|---|
| Desenvolvimento local | Demo (`localStorage`) ou emulador | Demo/Firebase | Desenvolvimento e testes. |
| Homologação | Firebase de teste | Firebase | Validação antes do go-live. |
| Produção | Firebase de produção | Firebase | Uso real da escola. |
| Demonstração | `localStorage` | Demo | Avaliação sem credenciais. |

## 7.6 Segurança da stack

| Controle | Implementação |
|---|---|
| Identidade | Firebase Authentication. |
| Autorização | Regras do Firestore + proteção de rotas no cliente. |
| Menor privilégio | Papéis `aluno`, `professor`, `admin`, `gestor`. |
| Segredos | Nenhum segredo no cliente; Gemini/Admin SDK somente no servidor (quando houver). |
| Transporte | HTTPS/TLS no Render. |
| Cabeçalhos | HSTS, `nosniff`, `X-Frame-Options`, COOP, `Referrer-Policy`, `Permissions-Policy`. |
| Dados | Apenas dados necessários; histórico sem token/IP/user-agent. |
| Recuperação | Rollback de deploy e export do Firestore antes de mudanças de schema. |

---

# 8. Planejamento

## 8.1 Abordagem

O projeto foi conduzido com apoio de agentes de IA especializados:

| Agente | Papel |
|---|---|
| Engenharia de Requisitos | Definir RF, NFR, regras, critérios de aceitação e rastreabilidade. |
| Arquiteto | Definir componentes, modelo de dados, segurança, contratos e ADRs. |
| Front-end | Implementar React/TypeScript, PWA e integração com serviços. |
| Back-end | Definir e implementar contratos, regras e operações server-side quando aplicável. |
| QA/Testador | Validar fluxos, regressões, acessibilidade e segurança. |
| Segurança | Revisar ameaças, permissões e exposição de dados. |
| IA | Especificar o assistente e as ferramentas permitidas. |

Ferramentas utilizadas: ChatGPT (planejamento e requisitos), OpenCode (agentes e
implementação), GitHub (versionamento), Render (publicação), Firebase (Auth/Firestore).

## 8.2 Etapas do projeto

| # | Etapa | Entregável | Critério de conclusão | Situação |
|---|---|---|---|---|
| 1 | Definição do problema e do projeto | Documento de requisitos e visão geral | Problema, objetivos e escopo aprovados. | Concluído |
| 2 | Criação do agente de Engenharia de Requisitos | Instruções e fluxo de requisitos | Agente operante e requisitos rastreáveis. | Concluído |
| 3 | Levantamento e priorização | RF, NFR, RN e critérios de aceitação | Baseline aprovada. | Concluído |
| 4 | Arquitetura | Visão geral, modelo de dados, segurança, ADRs | Decisões registradas e coerentes. | Concluído |
| 5 | Estrutura do projeto | React + TypeScript + Vite + Firebase | Build e lint funcionando. | Concluído |
| 6 | Autenticação e perfil | Login Google/e-mail, cadastro, recuperação, perfil | Fluxos de acesso validados. | Concluído |
| 7 | Catálogo e consulta | Professores, disciplinas, turmas, grades | Consulta por turma e professor funcional. | Concluído |
| 8 | Administração da grade | Edição de aulas, conflitos, configuração | Grade editável com validação. | Concluído |
| 9 | Histórico e ciclo de vida | Auditoria, arquivamento, reativação, exclusão | Operações rastreáveis. | Concluído |
| 10 | Favoritos e notificações | Favoritos, lista e leitura de notificações | Fluxos por usuário isolados. | Parcial |
| 11 | PWA | Manifest, service worker, instalação, atualização | Instalação e offline shell validados. | Concluído |
| 12 | Testes e correções | Checklist, testes negativos, correções | Fluxos críticos aprovados. | Em andamento |
| 13 | Publicação | Deploy no Render + GitHub | URL acessível e repositório público. | Concluído (confirmar URL) |
| 14 | Evoluções planejadas | IA, edição em massa, notificações automáticas | Dependem de aprovação e backend. | Pendente |

## 8.3 Cronograma macro

| Fase | Duração estimada | Foco |
|---|---|---|
| F1 — Requisitos | 1 semana | Problema, público, RF, NFR, RN e critérios. |
| F2 — Arquitetura | 1 semana | Componentes, dados, segurança, contratos e ADRs. |
| F3 — Fundação | 1 semana | Projeto, rotas, estilos, autenticação e serviços. |
| F4 — Núcleo | 2 semanas | Catálogo, consulta, grade, configuração e histórico. |
| F5 — Personalização | 1 semana | Favoritos, notificações e PWA. |
| F6 — Qualidade | 1 semana | Testes, correções, acessibilidade e desempenho. |
| F7 — Entrega | 1 semana | Deploy, documentação, links e apresentação. |

> O cronograma é macro e não substitui o acompanhamento das tarefas no repositório.

## 8.4 Estratégia de testes

| Tipo | Escopo | Ferramenta/Artefato | Situação |
|---|---|---|---|
| Unitário | Validação de horários, conflitos, datas e normalização. | Funções puras em `src/lib/validacaoHorarios.ts` | Parcial |
| Integração | Serviços Firebase/demo, transações e histórico. | Emulador/Firebase de teste | Manual |
| Regras do Firestore | Acesso por perfil, isolamento por usuário, escrita negada. | Emulador (JDK 21) | Pendente |
| E2E | Login, consulta, edição, arquivamento, PWA. | Navegador + checklist | Manual |
| Segurança negativa | Escrita direta indevida, alteração de papel, leitura cruzada. | Console do navegador/emulador | Manual |
| Acessibilidade | Teclado, foco, labels, contraste. | Auditoria + Lighthouse | Pendente |
| PWA | Instalação, offline shell, atualização. | Lighthouse/DevTools | Manual |
| Regressão | Fluxos críticos após cada release. | Checklist de `testes-fluxo-operacional.md` | Em andamento |

### 8.4.1 Casos de teste mínimos

| ID | Caso | Resultado esperado |
|---|---|---|
| CT-01 | Login Google | Sessão criada e perfil carregado. |
| CT-02 | Login e-mail/senha inválido | Mensagem clara, sem sessão. |
| CT-03 | Cadastro novo | Perfil `aluno` criado. |
| CT-04 | Acesso de aluno ao painel | Acesso negado. |
| CT-05 | Consulta de turma | Grade completa com horários. |
| CT-06 | Consulta de professor | Apenas aulas do professor. |
| CT-07 | Criar aula em slot vago | Aula e histórico gravados. |
| CT-08 | Conflito de professor | Bloqueio com mensagem. |
| CT-09 | Remover aula | Aula removida e histórico gravado. |
| CT-10 | Arquivar professor com aula | Bloqueio com lista de aulas. |
| CT-11 | Excluir cadastro arquivado sem aulas | Documento excluído, histórico preservado. |
| CT-12 | Alterar configuração com período em uso | Bloqueio. |
| CT-13 | Favoritar turma duas vezes | Sem duplicata. |
| CT-14 | Marcar notificação como lida | Contador atualizado. |
| CT-15 | Escrita direta no Firestore como aluno | Negada. |
| CT-16 | Alterar `role` via cliente | Negada. |
| CT-17 | Instalar PWA | Aplicação instalada e abre offline. |
| CT-18 | Atualização de versão | Aviso e recarga sem cache antigo. |

## 8.5 Critérios de aceitação da entrega

A versão 1 é considerada entregue quando:

- [ ] a aplicação estiver acessível por URL pública;
- [ ] o repositório estiver público no GitHub com histórico de commits;
- [ ] login, consulta, administração, histórico e PWA funcionarem em produção;
- [ ] nenhuma rota administrativa estiver acessível a aluno/professor;
- [ ] o build e o lint passarem sem erros;
- [ ] o checklist de deploy do Render estiver concluído;
- [ ] os domínios do Render estiverem autorizados no Firebase Auth;
- [ ] as regras e os índices do Firestore estiverem publicados;
- [ ] o documento de requisitos estiver versionado;
- [ ] os riscos e lacunas remanescentes estiverem registrados.

## 8.6 Riscos e pendências

| ID | Risco/pendência | Prob. | Impacto | Mitigação | Situação |
|---|---|---|---|---|---|
| RISCO-23 | Regras do Firestore sem teste automatizado (JDK 21). | Alta | Alto | Instalar JDK 21/CI e testar no emulador. | Aberto |
| RISCO-24 | Produção em modo demo por env ausente. | Alta | Alto | Checklist de env e falha de build se incompleto. | Mitigado |
| RISCO-25 | Login quebrado por domínio não autorizado. | Alta | Alto | Autorizar domínio no Firebase Auth antes do go-live. | Mitigado |
| RISCO-26 | PWA/CDN com versão antiga. | Média | Médio | `sw.js` sem cache e cache versionado. | Mitigado |
| RISCO-31 | Acesso público amplo (LAC-20). | Alta | Alto | Decidir restrição de domínio antes de divulgar. | Aberto |
| RISCO-32 | Modelo Client-Only sem autoridade server-side. | Alta | Alto | Regras revisadas; reavaliar Functions em nova ADR. | Herdado |
| — | RF21: regra vigente permite leitura de histórico a qualquer autenticado, embora a interface restrinja a admin/gestor. | Média | Alto | Alinhar `firestore.rules` ao requisito e testar. | Aberto |
| — | Edição em massa, IA e notificações automáticas não implementadas. | Alta | Médio | Planejadas para versão com backend. | Planejado |
| — | Suíte automatizada ausente. | Alta | Médio | Configurar testes unitários, de regras e E2E. | Pendente |
| — | Troca de aulas entre slots não está registrada em ADR-02. | Média | Baixo | Ratificar comportamento em ADR ou remover da v1. | Pendente |

## 8.7 Lacunas abertas

| ID | Lacuna | Impacto | Encaminhamento |
|---|---|---|---|
| **LAC-20** | Restrição de domínio de login (acesso público amplo). | Qualquer conta Google pode entrar como aluno. | Decisão de negócio antes de divulgar a URL. |
| **LAC-21** | Fuso horário oficial. | Cálculos de “hoje/amanhã” e exibição. | Confirmar `America/Sao_Paulo`. |
| **LAC-23/LAC-24** | Salas e alocação física. | RF54–RF56 fora do escopo. | ADR específica. |
| **LAC-03/RF58** | Gestão de administradores pela interface. | Atribuição manual de papéis. | Definir contrato e histórico de permissões. |
| **LAC-07** | Assistente de IA. | RF10 planejado. | Implementar com Functions/Gemini e cotas. |
| **LAC-14** | Calendário escolar e aulas futuras. | Exclusão considera qualquer aula. | Definir calendário antes de refinar. |

## 8.8 Próximos passos

1. Confirmar e registrar a URL pública e o repositório na entrega.
2. Alinhar a regra de leitura de `historico` ao RF21 (somente admin/gestor).
3. Configurar suíte de testes (unitários, regras e E2E) e executar o checklist completo.
4. Decidir LAC-20 antes de divulgar a aplicação.
5. Aprovar ou ajustar ADR-08 e registrar a ratificação do modelo Client-Only.
6. Planejar a versão com Cloud Functions para RF10, RF23–RF30 e RF47.
7. Revisar acessibilidade e desempenho com Lighthouse.
8. Manter este documento sincronizado a cada mudança de escopo.

## 8.9 Links de entrega

| Item | Endereço | Situação |
|---|---|---|
| Aplicação online | `https://horario-aula.onrender.com` | Configurado no Render; confirmar disponibilidade antes da entrega. |
| Repositório GitHub | `https://github.com/R3nato-code/horario-aula` | Confirmado no remoto do projeto. |
| Documento de requisitos | `docs/arquitetura/documento-de-requisitos.md` | Este arquivo; destino canônico: `docs/requisitos/Documento_de_requisitos.md`. |

---

# Apêndice A — Rastreabilidade resumida

| Grupo de requisitos | ADR/Decisão | Entidades | Fluxos |
|---|---|---|---|
| RF01–RF03 | ADR-01 | `users` | FL-01 |
| RF04–RF06, RF48–RF53 | ADR-01, ADR-06 | `professores`, `disciplinas`, `turmas` | FL-01 |
| RF07, RF11–RF16, RF31–RF35, RF41–RF42 | ADR-02 | `aulas`, `configuracao` | FL-01 |
| RF17–RF22, RF30, RF40 | ADR-04 | `historico` | FL-01, FL-02 |
| RF23–RF30, RF34–RF35 | ADR-03 | `aulas`, `historico`, `operacoes`, `outbox` | FL-02 |
| RF09, RF43–RF47 | ADR-05 | `favoritos`, `notificacoes` | FL-02 |
| RF10 | ADR-07 | `assistente_uso` | FL-03 |
| NFR de deploy | ADR-08 | `dist/`, Render | — |

# Apêndice B — Glossário de estados

| Estado | Onde se aplica | Significado |
|---|---|---|
| `ativo` | Professores, disciplinas, turmas | Pode ser usado em novas aulas. |
| `arquivado` | Professores, disciplinas, turmas | Não recebe novas aulas; pode ser reativado. |
| `lida` / `lidaEm` | Notificações | Controle de leitura pelo destinatário. |
| `entregue` | Requisito | Implementado na v1. |
| `parcial` | Requisito | Implementado com lacuna conhecida. |
| `planejado` | Requisito | Fora da v1. |
| `fora do escopo` | Requisito | Não será feito na v1. |
| `proposto` | Requisito | Sem aprovação para implementação. |

# Apêndice C — Histórico de decisões que afetam requisitos

| Decisão | Efeito nos requisitos |
|---|---|
| D-01 | Modelo Gemini `google/gemini-3.1-flash-lite` para o assistente. |
| D-02 | Turno único da manhã na v1. |
| ADR-02 | Horários derivados; sem snapshot na aula; ID determinístico. |
| ADR-03 | Limite de 200 aulas e operação tudo-ou-nada. |
| ADR-04 | Histórico único, imutável e com retenção indefinida. |
| ADR-05 | Notificações com TTL de 180 dias e favoritos diretos. |
| ADR-06 | Ciclo ativo → arquivado → excluído com preservação de histórico. |
| ADR-08 | Publicação estática no Render, sem servidor de aplicação. |

---

> **Encerramento:** este documento descreve a baseline de requisitos da versão 1. Alterações
> de escopo, novos requisitos ou mudanças de regra de negócio devem ser encaminhadas ao
> Engenharia de Requisitos, registradas com identificador próprio e refletidas na matriz de
> rastreabilidade antes da implementação.
