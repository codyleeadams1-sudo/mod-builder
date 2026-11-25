document.getElementById('send').addEventListener('click', async () => {
  const idea = document.getElementById('idea').value.trim();
  if (!idea) return;
  const url = 'http://127.0.0.1:3000/?idea=' + encodeURIComponent(idea) + '&category=other';
  await chrome.tabs.create({ url });
  window.close();
});
