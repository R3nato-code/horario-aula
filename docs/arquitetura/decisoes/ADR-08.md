# ADR-08 — Publicação do front-end como Static Site no Render

| Campo | Conteúdo |
|---|---|
| ID | ADR-08 |
| Título | SPA React/Vite publicada como Static Site no Render, com Firebase gerenciado fora do Render |
| Data | 07/11/2026 |
| Status | Proposta (aguarda aprovação do responsável humano) |
| Lacuna | LAC-20 (restrição de domínio de login) permanece aberta |
| Requisitos | NFR de disponibilidade, segurança e operação (rastreabilidade pendente) |

## Contexto

O projeto está no modelo **Client-Only**: React + TypeScript + Vite consomem diretamente
Firebase Authentication e Cloud Firestore. Não existe pasta `functions/` no repositório e
não há runtime de servidor a hospedar. O front-end é uma SPA com roteamento por hash
(`#/rota`), PWA com `public/sw.js` e configuração pública do Firebase injetada em tempo de
build por variáveis `VITE_*`.

O Render foi definido como destino de hospedagem. É preciso fixar **como** o artefato é
construído, publicado, autenticado e operado, sem reintroduzir servidor e sem acoplar o
deploy do front-end ao deploy das regras do Firestore.

Esta ADR **não altera** o modelo de autoridade Client-Only registrado em
`visao-geral.md` v2.0. Ela define apenas o canal de entrega e as obrigações operacionais
do deploy.

## Decisão

1. **Tipo de serviço:** o front-end será publicado como **Static Site** do Render
   (`type: web`, `runtime: static`). Não será usado Web Service Node, Docker ou qualquer
   processo de servidor no Render.
2. **Build reprodutível:** comando `npm ci && npm run build`; publicação do diretório
   `dist`. O `package-lock.json` é a fonte da árvore de dependências.
3. **Versão do Node fixada:** `NODE_VERSION=24.22.1` (LTS atual do Render e alinhada a
   `@types/node` 24). A versão mínima suportada pelo Vite 7 é 20.19+ / 22.12+; a versão
   deve ser fixada para evitar builds divergentes.
4. **Dependências instaladas pelo build:** definir `SKIP_INSTALL_DEPS=true` para evitar
   instalação automática duplicada e garantir que `npm ci` seja o único instalador.
5. **Variáveis de ambiente em tempo de build:** `VITE_DATA_MODE=firebase` e as quatro
   variáveis públicas do Firebase (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`). Variáveis `VITE_*` são **públicas
   por definição** e ficam embutidas no bundle; nenhum segredo pode usar esse prefixo.
6. **Roteamento:** manter o roteamento por hash. A regra de rewrite `/* → /index.html`
   (ação *Rewrite*) será configurada como defesa em profundidade para caminhos sem hash e
   para uma eventual migração futura; o Render serve primeiro recursos existentes, então
   `sw.js`, `manifest.webmanifest`, `/assets/*` e `/icons/*` não são capturados pela regra.
7. **Cabeçalhos HTTP:** o Render aplicará, no mínimo:
   - `Cross-Origin-Opener-Policy: same-origin-allow-popups` (login Google por popup);
   - `Cross-Origin-Embedder-Policy: unsafe-none`;
   - `X-Content-Type-Options: nosniff`;
   - `Referrer-Policy: strict-origin-when-cross-origin`;
   - `X-Frame-Options: DENY`;
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
   - `Cache-Control: public, max-age=31536000, immutable` em `/assets/*`;
   - `Cache-Control: no-cache` em `/sw.js` e `/manifest.webmanifest`.
8. **Firebase Authentication:** adicionar o domínio `*.onrender.com` do serviço e o domínio
   customizado (se houver) à lista de **domínios autorizados**. O `authDomain` continua
   sendo `<projeto>.firebaseapp.com`; não será usado o domínio do Render como `authDomain`,
   pois isso exigiria proxy de `/__/auth/*`, incompatível com hospedagem estática.
9. **Previews de PR desabilitados:** cada preview do Render recebe um subdomínio novo e o
   Firebase não aceita curinga em domínios autorizados. Previews automáticos quebrariam o
   login; eles ficam desligados no Blueprint. Se forem necessários, cada domínio deve ser
   autorizado manualmente e o preview tratado como ambiente separado.
10. **Firestore fora do build:** regras (`firestore.rules`) e índices
    (`firestore.indexes.json`) são publicados pelo Firebase CLI, em etapa separada. O build
    do Render nunca publica regras nem índices. A ordem de release é: índices → regras →
    front-end.
11. **Deploy contínuo:** push na branch `main` dispara build e deploy atômicos. Rollback é
    feito pelo histórico de deploys do Render ou por `git revert`; variáveis de ambiente não
    são revertidas pelo rollback de deploy.
12. **Blueprint opcional:** `render.yaml` pode versionar a configuração do Static Site, mas
    não deve conter segredos. Valores públicos do Firebase podem ser solicitados no
    dashboard (`sync: false`) para manter o repositório independente de ambiente.
13. **Gate de liberação:** nenhum deploy é considerado concluído sem o checklist e o smoke
    test definidos em `docs/arquitetura/deploy-render.md`.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Web Service Node/Express servindo `dist/` | Adiciona runtime, cold start, custo e superfície de ataque sem necessidade. O app não tem API própria. |
| Docker no Render | Mesmo custo do Web Service, com complexidade adicional de imagem e build. |
| Firebase Hosting | Tecnicamente adequado, mas contraria o destino definido (Render) e dividiria a operação de hospedagem. |
| Publicar em modo demonstração | Não atende ao uso real; os dados ficariam locais e o login Firebase não seria exercitado. |
| Migrar para history routing | Aumenta a dependência de rewrite e de testes de deep link; o hash routing já funciona em qualquer host estático. |
| Colocar a chave Gemini ou service account em `VITE_*` | Exposição pública de segredo; viola a fronteira de confiança. |
| Deixar previews automáticos ligados | Cada preview teria domínio não autorizado no Firebase Auth e o login falharia. |

## Consequências

**Ganhos**

- Deploy simples e barato: um único artefato estático, sem servidor para operar.
- TLS, CDN global, HTTP/2 e invalidação atômica fornecidos pelo Render.
- Separação clara entre entrega do front-end e segurança de dados no Firebase.
- Rollback rápido por histórico de deploy ou revert de commit.
- PWA e roteamento por hash continuam funcionando sem configuração de servidor.

**Custos e impactos**

- Toda configuração `VITE_*` é pública e imutável após o build; mudança exige novo deploy.
- Regras e índices precisam de disciplina operacional própria; um deploy de front-end não
  os atualiza.
- O service worker pode atrasar a percepção de atualização; é necessário servir `sw.js`
  sem cache e, idealmente, versionar o `CACHE_NAME` no build.
- Previews de PR ficam limitados por causa dos domínios autorizados do Firebase.
- A URL pública amplia a exposição do modelo Client-Only; LAC-20 continua aberta.

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-24 | Produção publicada em modo demo por ausência de `VITE_DATA_MODE` ou configuração incompleta. | Checklist de env, conferência do bundle e, idealmente, falha de build quando o modo Firebase estiver incompleto. |
| RISCO-25 | Login quebrado por domínio não autorizado no Firebase Auth. | Autorizar o domínio do Render e o customizado antes do go-live. |
| RISCO-26 | PWA/CDN servindo versão antiga após deploy. | `sw.js` com `no-cache`; versão no `CACHE_NAME`; smoke test de atualização. |
| RISCO-27 | Segredo exposto em variável `VITE_*`. | Apenas configuração pública; revisão do bundle e do `.env.example`. |
| RISCO-28 | Regras/índices dessincronizados do front-end. | Release em ordem e checklist único; nunca considerar o deploy do Render como deploy completo. |
| RISCO-29 | Limites de banda/build do plano Render. | Monitorar uso no dashboard; assets hashed e cache imutável reduzem banda. |
| RISCO-30 | Popup do Google bloqueado ou `window.opener` perdido. | COOP `same-origin-allow-popups`, teste em navegadores e mensagem de fallback. |
| RISCO-31 | Acesso público amplo por LAC-20 (sem restrição de domínio de login). | Decisão de negócio antes de divulgar a URL; restringir provider/domínio quando aprovado. |

## Aprovador

**Pendente.** Decisão proposta pelo Arquiteto em 07/11/2026, a pedido do responsável pelo
projeto. A publicação em produção exige aprovação explícita e conferência dos domínios
autorizados.
