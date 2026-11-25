chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'send-to-modforge', title: 'Send selection to ModForge AI', contexts: ['selection'] });
});
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'send-to-modforge' || !info.selectionText) return;
  const url = 'http://127.0.0.1:3000/?idea=' + encodeURIComponent(info.selectionText) + '&category=other';
  chrome.tabs.create({ url });
});
