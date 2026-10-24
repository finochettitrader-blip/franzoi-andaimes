# Franzoi Andaimes

Mantenha o site existente e siga o pedido de alteração do usuário.

- Textos e metadados: `src/content.json`.
- Fontes editáveis de CSS, JavaScript e assets: `dist/`. Não excluir essa pasta.
- HTML gerado por `scripts/build.mjs`; não manter mudanças somente no HTML final.
- Não há dependências npm ou credenciais necessárias para trabalhar localmente.
- Prévia: `node scripts/build.mjs`, `node scripts/check.mjs`, `node scripts/serve.mjs`.
- Antes de publicar: gerar `node scripts/build-netlify.mjs --preview` e `node scripts/build-netlify.mjs`, executar `node scripts/check.mjs` e `node scripts/check-production.mjs` e conferir a apresentação afetada.
- Destino existente: Netlify `franzoi-andaimes`, ID `13d6e75c-2e94-48de-9591-6468e85249ff`, domínio `https://andaimesfranzoi.com`. Não criar outro site ou migrar hospedagem para uma alteração de conteúdo.
- Manter o plano Free. Alterações de plano, titularidade, DNS ou e-mail dependem de pedido específico.
- Quando a integração Git estiver habilitada, um push para `main` pode publicar em produção. Respeite o pedido do usuário antes de enviar alterações à branch de produção.
- Verificação remota após publicar: `node scripts/verify-netlify-live.mjs`.
- Senhas, tokens, sessões e relatórios privados não pertencem ao repositório público.
