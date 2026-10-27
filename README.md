# Franzoi Andaimes

Código do site institucional: [andaimesfranzoi.com](https://andaimesfranzoi.com/).

HTML, CSS e JavaScript estáticos, gerados por Node.js. Hospedagem: projeto existente `franzoi-andaimes` na Netlify. Não há dependências npm, backend, banco de dados ou chaves de API necessárias para editar o site. Requer Node.js 20+; `.node-version` fixa o ambiente de build em Node.js 24.

## Executar localmente

```sh
node scripts/build.mjs
node scripts/check.mjs
node scripts/serve.mjs
```

Abra http://127.0.0.1:4173/. A moldura de revisão mobile fica em http://127.0.0.1:4173/preview-mobile.html. Encerre o servidor com Ctrl+C. A prévia sempre envia `noindex`.

## Onde editar

| Arquivo | Uso |
| --- | --- |
| `src/content.json` | Textos, equipamentos, contatos, domínio e metadados. |
| `dist/styles.css` | Layout, cores, fontes e responsividade. |
| `dist/app.js` | Menu, ordem mobile dos equipamentos e comportamento. |
| `dist/assets/` | Imagens, ícones, fonte e respectiva licença. |
| `scripts/build.mjs` | Estrutura HTML e geração dos metadados. |
| `scripts/build-netlify.mjs` | Saídas de produção e prévia para Netlify. |
| `netlify.toml` | Comando de build e diretórios publicados por ambiente. |
| `deployment/netlify/_redirects` | Redirecionamentos dos domínios oficiais. |

**A pasta `dist/` contém fontes editáveis e não deve ser apagada como saída descartável.** Edite textos no JSON e estrutura no gerador; mudanças feitas somente em `dist/index.html` serão substituídas no próximo build.

## Validar antes de publicar

```sh
node scripts/build-netlify.mjs --preview
node scripts/build-netlify.mjs
node scripts/check.mjs
node scripts/check-production.mjs
```

Confira o layout mobile e desktop quando alterar sua apresentação. As imagens e a fonte são locais. A fonte Barlow Condensed acompanha sua licença em `dist/assets/fonts/`.

## Publicação por Git

Este repositório foi preparado para se conectar ao projeto Netlify existente, ID `13d6e75c-2e94-48de-9591-6468e85249ff`. A conexão remota precisa estar concluída no painel Netlify para a automação funcionar. A existência deste arquivo não comprova a conexão.

Configuração esperada: branch `main`, base na raiz do repositório, comando `node scripts/build-netlify.mjs` e pasta publicada `netlify-dist`. Após a conexão e com publicação automática habilitada, alterações enviadas à branch de produção geram uma nova publicação. Pull requests usam `netlify-preview`, sem indexação.

O colaborador precisa ter acesso de escrita ao repositório e usar suas próprias credenciais GitHub. Clonar um repositório público permite ler o código, mas não concede permissão para publicar alterações.

Para verificar uma publicação real:

```sh
node scripts/verify-netlify-live.mjs
```

O relatório local compara os arquivos públicos com o pacote gerado e verifica redirecionamentos e HTTPS. Não publique esse relatório como conteúdo do site. A opção `--resolver=1.1.1.1` faz a consulta DNS apenas nesse processo, sem modificar o computador.

Para reverter, use uma publicação anterior válida na Netlify ou reverta o commit correspondente. O domínio permanece `andaimesfranzoi.com`; manutenção do conteúdo não exige alterar DNS.

## Conteúdo aprovado

Equipamentos: Andaimes tubulares, Betoneira e Guincho de coluna. No mobile, os cards ficam na ordem Andaimes, Guincho, Betoneira; no desktop, Andaimes, Betoneira, Guincho. A imagem de compartilhamento circular tem transparência externa. Venda e galeria permanecem ocultas enquanto desabilitadas no conteúdo.

## Portfólio em página própria

A página inicial mantém uma chamada compacta para `/equipamentos/`. O gerador produz `equipamentos/index.html` nos pacotes local, de produção e Netlify, com os mesmos cadastros de `src/content.json`, agrupados por `equipmentGroups`. O sitemap inclui as duas páginas.

Prévia: http://127.0.0.1:4173/equipamentos/ (ou a porta definida em `PORT`). O servidor local aceita a rota com barra final e redireciona `/equipamentos` para `/equipamentos/`.

Em ambientes que bloqueiam subprocessos, execute `node scripts/check.mjs --skip-syntax` e rode `node --check` separadamente nos arquivos JavaScript.
