document.getElementById("open-btn").addEventListener("click", () => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  window.close();
});
