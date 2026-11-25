document.getElementById('send').addEventListener('click', () => {
  const idea = document.getElementById('idea').value.trim();
  if (!idea) {
    document.getElementById('idea').focus();
    return;
  }
  const params = new URLSearchParams({ idea: idea.slice(0, 2000), category: 'other' });
  window.location.href = `modforge://create?${params.toString()}`;
  document.getElementById('status').textContent = 'Launching ModForge AI…';
});
