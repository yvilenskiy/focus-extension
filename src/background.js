importScripts("config.js");

const { SESSION_ALLOW_KEY, isHomeUrl, loadConfig, matchSite } = self.FocusGate;

const readAllowedTabs = async () => {
  const result = await chrome.storage.session.get(SESSION_ALLOW_KEY);
  return result[SESSION_ALLOW_KEY] || {};
};

const writeAllowedTabs = async (allowedTabs) => {
  await chrome.storage.session.set({ [SESSION_ALLOW_KEY]: allowedTabs });
};

const getTabAllowance = async (tabId) => {
  const allowedTabs = await readAllowedTabs();
  return allowedTabs[String(tabId)] || null;
};

const allowTab = async (tabId, siteId) => {
  const allowedTabs = await readAllowedTabs();
  allowedTabs[String(tabId)] = { siteId, allowedAt: Date.now() };
  await writeAllowedTabs(allowedTabs);
};

const clearTab = async (tabId) => {
  const allowedTabs = await readAllowedTabs();
  delete allowedTabs[String(tabId)];
  await writeAllowedTabs(allowedTabs);
};

const getGateState = async (url, tabId) => {
  const config = await loadConfig();
  const site = matchSite(url, config);

  if (!site) {
    return { site: null, allowed: false, shouldRedirectHome: false };
  }

  const allowance = await getTabAllowance(tabId);
  const allowed = allowance?.siteId === site.id;

  return {
    site,
    allowed,
    shouldRedirectHome: allowed && isHomeUrl(url, site)
  };
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (typeof tabId !== "number") {
    sendResponse({ ok: false, error: "No tab is available for this request." });
    return false;
  }

  (async () => {
    if (message.type === "focus-gate:get-state") {
      sendResponse(await getGateState(message.url, tabId));
      return;
    }

    if (message.type === "focus-gate:allow") {
      await allowTab(tabId, message.siteId);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "focus-gate:close-tab") {
      await chrome.tabs.remove(tabId);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown Focus Gate message." });
  })();

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTab(tabId);
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) {
    return;
  }

  const config = await loadConfig();
  const site = matchSite(details.url, config);
  const allowance = await getTabAllowance(details.tabId);

  if (!site || (allowance && allowance.siteId !== site.id)) {
    await clearTab(details.tabId);
  }
});
