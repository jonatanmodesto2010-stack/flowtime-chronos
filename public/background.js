// Service Worker para a extensão
chrome.action.onClicked.addListener((tab) => {
  // Abre a página da extensão em uma nova aba
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});
