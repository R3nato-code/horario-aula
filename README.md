# Horários Escolares — Documento de Requisitos

Aplicação web responsiva e instalável (PWA) para **gestão e consulta dos horários**
do Colégio Estadual Presidente Kennedy.

| Entrega | Endereço |
|---|---|
| Aplicação online | https://horario-aula.onrender.com |
| Repositório GitHub | https://github.com/R3nato-code/horario-aula |
| Documento completo | `docs/arquitetura/documento-de-requisitos.md` |

**Versão:** 1.0 · **Data:** 08/11/2026 · **Status:** v1 entregue, com pendências registradas.

  # OBS: As aulas não correspondem totalmente ao modelo atual (Sujeito a alterações)

---

## 1. Introdução

O horário escolar do colégio circula em planilhas, documentos e comunicações informais.
Isso gera versões desatualizadas, consultas lentas e risco de conflitos de alocação.

A aplicação centraliza essa informação em um único sistema, com consulta por turma e por
professor, administração da grade com validação de conflitos e registro de todas as
alterações em histórico auditável.

**Escopo da v1:** login, consulta de horários, favoritos, notificações, cadastros, edição da
grade, configuração de períodos, histórico e PWA.
**Fora do escopo:** edição em massa, assistente de IA, salas e gestão de usuários pela
interface — previstos para versão futura.

## 2. Objetivos

| ID | Objetivo | Critério de sucesso |
|---|---|---|
| O1 | Centralizar a consulta de horários | Grade localizada em até 3 interações |
| O2 | Eliminar conflitos de alocação | Nenhum professor em duas turmas no mesmo horário |
| O3 | Dar autonomia à secretaria | Cadastros e grade mantidos sem apoio técnico |
| O4 | Garantir rastreabilidade | 100% das alterações registradas em histórico |
| O5 | Permitir acesso em qualquer dispositivo | Uso de 320 px a 1920 px e instalação como PWA |

## 3. Público-alvo

| Perfil | Necessidade principal | Permissões |
|---|---|---|
| **Aluno** | Consultar o horário da turma e dos professores | Consulta, favoritos e notificações |
| **Professor** | Consultar a própria agenda semanal | Mesmo acesso do aluno na v1 |
| **Administrador** | Manter cadastros, grade e histórico | Painel administrativo |
| **Gestor** | Configurar períodos, duração e intervalo | Acesso administrativo completo |

## 4. Requisitos funcionais

| ID | Requisito | Situação |
|---|---|---|
| RF01 | Autenticar com Google e e-mail/senha, com cadastro e recuperação de senha | Entregue |
| RF02 | Criar perfil automático com papel `aluno`, sem o cliente escolher o papel | Entregue |
| RF03 | Aplicar papéis `aluno`, `professor`, `admin` e `gestor` com menor privilégio | Parcial |
| RF04–RF06 | Criar, consultar, editar, arquivar, reativar e excluir professores, disciplinas e turmas | Entregue |
| RF07 | Criar, editar, remover e trocar aulas entre slots da mesma turma | Entregue |
| RF08 | Exibir painel administrativo com indicadores e atalhos por perfil | Entregue |
| RF09 | Favoritar e desfavoritar turmas, isolando os favoritos por usuário | Entregue |
| RF11–RF12 | Consultar horários por turma e aulas por professor | Entregue |
| RF13–RF16 | Editar aula individual, exigindo disciplina e professor ativos | Entregue |
| RF17–RF22 | Registrar histórico com antes/depois, autor e data, sem edição ou exclusão | Entregue |
| RF31–RF35 | Bloquear conflitos de professor e de turma e gravar de forma atômica | Entregue |
| RF36–RF40 | Configurar abertura, períodos, intervalo e validar a coerência | Entregue |
| RF41–RF42 | Derivar horários reais de início e fim a partir da configuração | Entregue |
| RF45–RF46 | Listar notificações e marcar como lidas | Entregue |
| RF43–RF44 | Gerar notificação automática para quem favoritou a turma alterada | Planejado |
| RF48–RF53 | Ciclo de vida dos cadastros (ativo → arquivado → excluído) | Parcial |
| RF-T01–RF-T06 | Estados de tela, mensagens claras, confirmação, rotas, modo de dados e PWA | Entregue |

## 5. Requisitos não funcionais

| ID | Requisito | Critério verificável |
|---|---|---|
| NFR-01 | Aplicar menor privilégio em rotas, serviços e regras | Aluno/professor não acessam rota administrativa |
| NFR-02 | Coletar apenas dados necessários (LGPD) | Perfil com `uid`, e-mail, nome e papel |
| NFR-04 | Impedir autoatribuição de papel administrativo | Cliente não altera o próprio `role` |
| NFR-05 | Não expor segredos no cliente | Apenas configuração pública `VITE_*` no bundle |
| NFR-13 | Ser responsiva e mobile-first | Fluxos críticos de 320 px a 1920 px |
| NFR-15 | Ser acessível por teclado e leitor de tela | Navegação por Tab, labels e foco visível |
| NFR-17 | Ser instalável como PWA | Manifest, ícones 192/512 e service worker |
| NFR-18 | Funcionar offline no shell estático | Aplicação abre sem rede |
| NFR-26 | Usar TypeScript estrito e lint | `npm run typecheck` e `npm run lint` sem erros |
| NFR-31 | Ter suíte automatizada de regressão | Pendente — testes da v1 são manuais |

## 6. Regras de negócio

| ID | Regra |
|---|---|
| RN-01/RN-02 | Todo usuário autenticado tem um perfil; o papel padrão é `aluno` |
| RN-07 | No máximo uma aula por turma, dia da semana e período |
| RN-08 | Slot vago não possui registro de aula |
| RN-09 | Toda aula exige turma, disciplina e professor ativos |
| RN-10 | Um professor não pode estar em duas turmas no mesmo dia e período |
| RN-11 | Horários de início e fim são derivados da configuração, não gravados na aula |
| RN-16/RN-17 | Períodos não se sobrepõem e não invadem o intervalo |
| RN-18 | Não é permitido remover período que possua aulas |
| RN-21–RN-24 | Arquivar e excluir exigem zero aulas vinculadas; excluir exige cadastro arquivado |
| RN-27 | O histórico é imutável (append-only) |
| RN-41 | Aula e histórico são gravados na mesma transação |

## 7. Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Autenticação | Firebase Authentication (Google e e-mail/senha) |
| Banco de dados | Cloud Firestore + Security Rules |
| PWA | Manifest e service worker próprios |
| Hospedagem | Render (Static Site) |
| Versionamento | Git e GitHub |
| Qualidade | ESLint + typescript-eslint |
| Modo demonstração | `localStorage`, sem Firebase |

**Execução local:** `npm install` → `npm run dev` · **Build:** `npm run build`

## 8. Planejamento

| # | Etapa | Situação |
|---|---|---|
| 1 | Definição do problema e do projeto | Concluído |
| 2 | Criação do agente de Engenharia de Requisitos | Concluído |
| 3 | Levantamento de RF, NFR, regras e critérios de aceitação | Concluído |
| 4 | Arquitetura, modelo de dados e segurança | Concluído |
| 5 | Estrutura do projeto e autenticação | Concluído |
| 6 | Consulta, cadastros, grade e configuração | Concluído |
| 7 | Histórico, favoritos, notificações e PWA | Concluído |
| 8 | Testes, correções e publicação | Concluído |


**Estratégia de testes:** validação manual por checklist dos fluxos críticos (login, consulta,
edição da grade, conflitos, arquivamento, histórico e instalação do PWA), complementada por
funções puras de validação de horários.


