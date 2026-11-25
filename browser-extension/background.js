chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-to-modforge',
    title: 'Send selection to ModForge AI',
    contexts: ['selection']
  });
});

function openInModForge(idea) {
  const params = new URLSearchParams({ idea: String(idea || '').slice(0, 2000), category: 'other' });
  chrome.tabs.create({ url: `modforge://create?${params.toString()}` });
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'send-to-modforge' && info.selectionText) {
    openInModForge(info.selectionText);
  }
});
