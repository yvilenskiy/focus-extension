(() => {
  if (window.top !== window) {
    return;
  }

  const rootId = "focus-gate-root";
  let currentSiteId = null;

  const sendMessage = (message) => chrome.runtime.sendMessage(message);

  const randomPosition = () => ({
    left: `${Math.round(8 + Math.random() * 76)}vw`,
    top: `${Math.round(10 + Math.random() * 78)}vh`
  });

  const removeGate = () => {
    document.getElementById(rootId)?.remove();
    document.documentElement.style.removeProperty("overflow");
    document.body?.style.removeProperty("overflow");
    currentSiteId = null;
  };

  const appendWhenReady = (element) => {
    if (document.body) {
      document.body.append(element);
      return;
    }

    requestAnimationFrame(() => appendWhenReady(element));
  };

  const createGate = (site) => {
    if (currentSiteId === site.id && document.getElementById(rootId)) {
      return;
    }

    removeGate();
    currentSiteId = site.id;

    const root = document.createElement("div");
    const panel = document.createElement("section");
    const title = document.createElement("h1");
    const closeButton = document.createElement("button");
    const workLink = document.createElement("button");
    const workLinkPosition = randomPosition();

    root.id = rootId;
    panel.className = "focus-gate-panel";
    title.className = "focus-gate-title";
    closeButton.className = "focus-gate-close";
    workLink.className = "focus-gate-work-link";

    title.textContent = "Working?";
    closeButton.textContent = "Wasting time";
    workLink.textContent = "Continue for work";
    workLink.style.left = workLinkPosition.left;
    workLink.style.top = workLinkPosition.top;

    closeButton.addEventListener("click", () => {
      sendMessage({ type: "focus-gate:close-tab" });
    });

    workLink.addEventListener("click", async () => {
      await sendMessage({ type: "focus-gate:allow", siteId: site.id });
      window.location.assign(site.defaultUrl);
    });

    panel.append(title, closeButton);
    root.append(panel, workLink);
    appendWhenReady(root);

    document.documentElement.style.overflow = "hidden";
    if (document.body) {
      document.body.style.overflow = "hidden";
    }
  };

  const applyGate = async () => {
    const state = await sendMessage({
      type: "focus-gate:get-state",
      url: window.location.href
    });

    if (!state?.site) {
      removeGate();
      return;
    }

    if (!state.allowed) {
      createGate(state.site);
      return;
    }

    removeGate();

    if (
      state.shouldRedirectHome &&
      window.location.href !== state.site.defaultUrl
    ) {
      window.location.replace(state.site.defaultUrl);
    }
  };

  applyGate();
  document.addEventListener("DOMContentLoaded", applyGate);
  window.addEventListener("focus", applyGate);
})();
