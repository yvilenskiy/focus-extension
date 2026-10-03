(() => {
  if (window.top !== window) {
    return;
  }

  const redirectHome = async () => {
    const currentUrl = window.location.href;
    const config = await self.FocusGate.loadConfig();
    if (currentUrl !== window.location.href) {
      return;
    }
    const site = self.FocusGate.matchSite(currentUrl, config);
    if (
      site?.defaultUrl &&
      self.FocusGate.isHomeUrl(currentUrl, site) &&
      currentUrl !== site.defaultUrl
    ) {
      window.location.replace(site.defaultUrl);
    }
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "focus-gate:url-changed") {
      redirectHome();
    }
  });
  window.addEventListener("popstate", redirectHome);
  window.addEventListener("focus", redirectHome);
  redirectHome();
})();
