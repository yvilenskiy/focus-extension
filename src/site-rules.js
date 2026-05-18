(() => {
  if (window.top !== window) {
    return;
  }

  const hideElement = (element) => {
    if (element instanceof HTMLElement) {
      element.style.setProperty("display", "none", "important");
    }
  };

  const hideBySelector = (selectors) => {
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(hideElement);
    }
  };

  const upsertStyle = (id, css) => {
    let style = document.getElementById(id);

    if (!style) {
      style = document.createElement("style");
      style.id = id;
      (document.head || document.documentElement).append(style);
    }

    style.textContent = css;
  };

  const removeStyle = (id) => {
    document.getElementById(id)?.remove();
  };

  const textIncludes = (element, values) => {
    const text = `${element.getAttribute("aria-label") || ""} ${element.textContent || ""}`
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return values.some((value) => text.includes(value.toLowerCase()));
  };

  const hideClosestNavItem = (selectors, labels) => {
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((element) => {
        if (!textIncludes(element, labels)) {
          return;
        }

        hideElement(
          element.closest("li, div[role='listitem'], [data-testid]") || element
        );
      });
    }
  };

  const hideClosestLinkedInNavItem = (selectors) => {
    hideBySelector(
      selectors.map(
        (selector) =>
          `.global-nav__primary-item:has(${selector}), .global-nav__item:has(${selector})`
      )
    );
    hideBySelector(selectors);
  };

  const hideXTimelineContent = () => {
    hideBySelector([
      "[data-testid='primaryColumn'] section[role='region'][aria-labelledby^='accessible-list-']",
      "[data-testid='primaryColumn'] div[aria-label='Timeline: Explore']",
      "[data-testid='primaryColumn'] div[aria-label='Timeline: Explore'] > div",
      "[data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline']",
      "[data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline'] > div",
      "[data-testid='primaryColumn'] div[aria-label='Home timeline'] > div:nth-child(n+3)"
    ]);

    document
      .querySelectorAll(
        "[data-testid='primaryColumn'] div[aria-label='Timeline: Explore'], [data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline']"
      )
      .forEach((timeline) => {
        hideElement(timeline);
        hideElement(timeline.closest("section[role='region']"));
      });

    document
      .querySelectorAll("[data-testid='primaryColumn'] div[aria-label='Home timeline']")
      .forEach((timeline) => {
        Array.from(timeline.children)
          .slice(2)
          .forEach(hideElement);
      });
  };

  const cleanX = () => {
    hideBySelector([
      "a[href='/home']",
      "a[href='/explore']",
      "a[href='/i/premium_sign_up']",
      "[data-testid='AppTabBar_Home_Link']",
      "[data-testid='AppTabBar_Explore_Link']",
      "[data-testid='AppTabBar_More_Menu']"
    ]);

    hideClosestNavItem("nav a, nav button, [role='navigation'] a", [
      "Home",
      "Explore",
      "Creator Studio",
      "Premium",
      "More"
    ]);

    upsertStyle(
      "focus-gate-x-discovery-cleanup",
      `
        [data-testid='primaryColumn'] section[role='region'][aria-labelledby^='accessible-list-'],
        [data-testid='primaryColumn'] div[aria-label='Timeline: Explore'],
        [data-testid='primaryColumn'] div[aria-label='Timeline: Explore'] > div,
        [data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline'],
        [data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline'] > div,
        [data-testid='primaryColumn'] div[aria-label='Home timeline'] > div:nth-child(n+3) {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
          visibility: hidden !important;
        }
      `
    );
    hideXTimelineContent();

    if (
      window.location.pathname.startsWith("/explore") ||
      window.location.pathname.startsWith("/search")
    ) {
      hideBySelector([
        "[data-testid='primaryColumn'] section[role='region'][aria-labelledby^='accessible-list-']",
        "[data-testid='primaryColumn'] div[aria-label='Timeline: Explore']",
        "[data-testid='primaryColumn'] div[aria-label='Timeline: Explore'] > div",
        "[data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline']",
        "[data-testid='primaryColumn'] div[aria-label='Timeline: Search timeline'] > div",
        "[data-testid='primaryColumn'] div[aria-label='Home timeline'] > div:nth-child(n+3)",
        "[aria-label='Timeline: Explore']",
        "[aria-label='Timeline: Search timeline']",
        "[aria-label^='Timeline:']"
      ]);
      hideXTimelineContent();
    }
  };

  const cleanLinkedIn = () => {
    const connectionsUrl =
      "https://www.linkedin.com/mynetwork/invite-connect/connections/";

    if (window.location.pathname.startsWith("/mynetwork/grow")) {
      window.location.replace(connectionsUrl);
      return;
    }

    document.querySelectorAll("a[href*='/mynetwork/grow/']").forEach((link) => {
      link.setAttribute("href", connectionsUrl);
    });

    hideBySelector([
      ".global-nav__branding",
      "a[href*='/learning/']",
      ".scaffold-layout__aside",
      ".ad-banner-container",
      ".global-footer-compact",
      "footer"
    ]);

    hideClosestLinkedInNavItem([
      "a[href*='/feed/']",
      "a[href*='/mynetwork/']",
      "a[href*='/jobs/']",
      "a[href*='/messaging/']",
      "a[href*='/notifications/']",
      "a[href*='/learning/']",
      "a[href*='/premium/']",
      "button[aria-label*='For Business']",
      "button[aria-label*='Business']"
    ]);

    hideClosestNavItem(".global-nav__primary-link, .global-nav button", [
      "Home",
      "My Network",
      "Jobs",
      "Messaging",
      "Notifications",
      "For Business",
      "Learning",
      "Try Premium"
    ]);
  };

  const cleanYouTube = () => {
    hideBySelector([
      "ytd-guide-renderer",
      "ytd-mini-guide-renderer",
      "#guide",
      "#chips-wrapper",
      "ytd-rich-grid-renderer",
      "ytd-rich-section-renderer",
      "ytd-reel-shelf-renderer",
      "ytd-watch-next-secondary-results-renderer",
      "ytd-comments",
      "#secondary"
    ]);
  };

  const cleanInstagram = () => {
    const isDirectPage = window.location.pathname.startsWith("/direct");

    hideBySelector([
      "nav a[href='/']",
      "nav a[href='/reels/']",
      "nav a[href='/explore/']",
      "nav a[href='/create/select/']",
      "nav a[href^='/accounts/activity/']"
    ]);

    if (!isDirectPage) {
      hideBySelector(["aside", "main section", "main article"]);
    }

    hideClosestNavItem("nav a, nav button, nav div[role='button']", [
      "Home",
      "Reels",
      "Explore",
      "Notifications",
      "Create",
      "More",
      "Also from Meta"
    ]);
  };

  const cleaners = {
    x: cleanX,
    linkedin: cleanLinkedIn,
    youtube: cleanYouTube,
    instagram: cleanInstagram
  };

  let cachedConfig = null;
  let scheduled = false;

  const getConfig = async () => {
    cachedConfig ||= await self.FocusGate.loadConfig();
    return cachedConfig;
  };

  const applySiteRules = async () => {
    const config = await getConfig();
    const site = self.FocusGate.matchSite(window.location.href, config);

    if (!site) {
      return;
    }

    for (const rule of site.siteRules) {
      cleaners[rule]?.();
    }
  };

  const scheduleSiteRules = () => {
    if (scheduled) {
      return;
    }

    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      applySiteRules();
    }, 100);
  };

  const observer = new MutationObserver(scheduleSiteRules);

  applySiteRules();
  document.addEventListener("DOMContentLoaded", scheduleSiteRules);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
