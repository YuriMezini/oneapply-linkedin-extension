// OneApply – Background Service Worker
// Clicking the extension icon opens the side panel directly.

chrome.runtime.onInstalled.addListener(() => {
  // Open panel automatically when toolbar icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Also handle direct action click as fallback
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
