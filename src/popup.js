(() => {
  const summaryElement = document.getElementById("summary");
  const optionsButton = document.getElementById("options");

  optionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  (async () => {
    const config = await self.FocusGate.loadConfig();
    const enabledSites = config.sites.filter((site) => site.enabled);
    summaryElement.textContent = `${enabledSites.length} website${
      enabledSites.length === 1 ? "" : "s"
    } protected.`;
  })();
})();
