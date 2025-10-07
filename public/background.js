// Service Worker para a extensão

// Quando clica no ícone da extensão
chrome.action.onClicked.addListener((tab) => {
  openTimeline();
});

// Quando recebe mensagem do injector
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openTimeline') {
    openTimeline();
  }
});

// Função para abrir a timeline
function openTimeline() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
}
