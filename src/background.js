// LinkedIn and other supported sites change routes without reloading the page.
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  chrome.tabs.sendMessage(details.tabId, {
    type: "focus-gate:url-changed"
  }, { frameId: 0 }).catch(() => {
    // A content script may not exist, or the tab may have closed.
  });
});
