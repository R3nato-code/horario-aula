/* Service worker do PWA.
 * Escopo: somente arquivos estáticos da aplicação.
 * Nenhum dado de usuário, resposta autenticada ou dado do Firestore é armazenado.
 */
const CACHE_NAME = 'horario-aula-estatico-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const requisicao = event.request;
  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro, com fallback para o shell em caso de indisponibilidade.
  if (requisicao.mode === 'navigate') {
    event.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copia));
          return resposta;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Arquivos versionados pelo Vite: cache primeiro.
  if (url.pathname.includes('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(requisicao).then(
        (emCache) =>
          emCache ??
          fetch(requisicao).then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(requisicao, copia));
            return resposta;
          }),
      ),
    );
  }
});
