# Como Instalar a Extensão

## Passo 1: Build do Projeto
Execute o comando para criar a versão de produção:
```bash
npm run build
```

Isso criará uma pasta `dist/` com todos os arquivos da extensão.

## Passo 2: Instalar no Chrome

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" no canto superior direito
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `dist/` do seu projeto
5. A extensão será instalada e você verá o ícone na barra de ferramentas

## Passo 3: Usar a Extensão

Clique no ícone da extensão na barra de ferramentas do Chrome para abrir o gerenciador de cobranças em uma nova aba.

## Compatibilidade

Esta extensão é compatível com:
- Google Chrome
- Microsoft Edge
- Brave
- Qualquer navegador baseado em Chromium

## Notas

- Todos os dados são salvos localmente no navegador usando localStorage
- Os dados não são sincronizados entre dispositivos
- Para sincronizar dados, seria necessário adicionar a permissão `storage.sync` e modificar o código para usar `chrome.storage.sync`
