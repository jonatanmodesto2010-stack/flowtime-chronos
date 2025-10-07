// Injector Script - Adiciona botão flutuante em todas as páginas
(function() {
  'use strict';

  // Verifica se o botão já existe
  if (document.getElementById('timeline-extension-button')) {
    return;
  }

  // Cria o botão flutuante
  const button = document.createElement('button');
  button.id = 'timeline-extension-button';
  button.innerHTML = '📅';
  button.title = 'Abrir Time Line';
  
  // Estilos do botão
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#4F46E5',
    color: 'white',
    fontSize: '28px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
    zIndex: '999999',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.6)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
  });

  // Click event - abre a extensão em nova aba
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openTimeline' });
  });

  // Adiciona o botão ao body
  document.body.appendChild(button);
})();
