(() => {
  const sitesElement = document.getElementById("sites");
  const formElement = document.getElementById("add-site");
  const messageElement = document.getElementById("message");
  const resetButton = document.getElementById("reset");

  let config = null;

  const showMessage = (message) => {
    messageElement.textContent = message;
  };

  const saveAndRender = async () => {
    await self.FocusGate.saveConfig(config);
    render();
  };

  const render = () => {
    sitesElement.replaceChildren();

    for (const site of config.sites) {
      const card = document.createElement("article");
      const header = document.createElement("header");
      const title = document.createElement("div");
      const enabledButton = document.createElement("button");
      const meta = document.createElement("div");
      const actions = document.createElement("div");
      const removeButton = document.createElement("button");

      card.className = "site-card";
      title.className = "site-title";
      meta.className = "site-meta";
      actions.className = "site-actions";
      enabledButton.className = "secondary-button";
      removeButton.className = "danger-button";

      title.textContent = site.label;
      enabledButton.textContent = site.enabled ? "Enabled" : "Disabled";
      meta.innerHTML = `
        <span>Hosts: ${site.matchHosts.join(", ")}</span>
        <span>Default: ${site.defaultUrl}</span>
        <span>Rules: ${site.siteRules.length ? site.siteRules.join(", ") : "none"}</span>
      `;
      removeButton.textContent = "Remove";

      enabledButton.addEventListener("click", async () => {
        site.enabled = !site.enabled;
        await saveAndRender();
      });

      removeButton.addEventListener("click", async () => {
        config.sites = config.sites.filter((item) => item.id !== site.id);
        await saveAndRender();
      });

      header.append(title, enabledButton);
      actions.append(removeButton);
      card.append(header, meta, actions);
      sitesElement.append(card);
    }
  };

  formElement.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const formData = new FormData(formElement);
      const site = self.FocusGate.createSite(
        String(formData.get("label") || ""),
        String(formData.get("site-url") || ""),
        String(formData.get("default-url") || "")
      );

      config.sites.push(site);
      await saveAndRender();
      formElement.reset();
      showMessage("Website added.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to add website.");
    }
  });

  resetButton.addEventListener("click", async () => {
    await chrome.storage.sync.remove(self.FocusGate.CONFIG_KEY);
    config = await self.FocusGate.loadConfig();
    render();
    showMessage("Defaults restored.");
  });

  (async () => {
    config = await self.FocusGate.loadConfig();
    render();
  })();
})();
