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

    if (style.textContent !== css) {
      style.textContent = css;
    }
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
    for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
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
    // Profile counters also link to /feed/followers/ and /mynetwork/.
    // Apply navigation rules only inside navigation containers.
    const scopes = [".global-nav", "nav", "[role='navigation']"];
    const navSelectors = scopes.flatMap((scope) =>
      selectors.map((selector) => `${scope} ${selector}`)
    );
    document.querySelectorAll(navSelectors.join(", ")).forEach((element) => {
      hideElement(
        element.closest(".global-nav__primary-item, .global-nav__item") || element
      );
    });
  };

  let isProfilePage = false;

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

    const isFeedPage = /^\/(?:$|(?:home|explore|search)(?:\/|$))/.test(window.location.pathname);
    if (!isFeedPage) {
      removeStyle("focus-gate-x-discovery-cleanup");
      return;
    }

    const isDiscoveryPage = /^\/(?:explore|search)(?:\/|$)/.test(window.location.pathname);
    // Keep timeline hiding in a removable stylesheet so SPA navigation restores content.
    upsertStyle(
      "focus-gate-x-discovery-cleanup",
      `
        [data-testid='primaryColumn'] section[role='region'][aria-labelledby^='accessible-list-'],
        [data-testid='primaryColumn'] section[role='region']:has(div[aria-label='Timeline: Explore'], div[aria-label='Timeline: Search timeline']),
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
        ${isDiscoveryPage ? "[aria-label^='Timeline:'] { display: none !important; }" : ""}
      `
    );
  };

  const hideLinkedInRightColumn = () => {
    const isSearchPage = /^\/search(?:\/|$)/.test(window.location.pathname);
    const isActivityPage = /^\/in\/[^/]+\/recent-activity(?:\/|$)/.test(window.location.pathname);
    const hideSideColumn = isProfilePage || isSearchPage;
    // Activity also has a left profile aside. Hide its right column by class
    // or position instead of hiding every semantic aside.
    upsertStyle(
      "focus-gate-linkedin-right-column",
      `.scaffold-layout__aside { display: none !important; }
       ${hideSideColumn && !isActivityPage ? "main aside, main [role='complementary'], [role='main'] aside, [role='main'] [role='complementary'] { display: none !important; }" : ""}`
    );

    if (!hideSideColumn) {
      return;
    }

    // Search layouts without semantic sidebars: locate the entire column
    // containing recommendations, using the adjacent results column as a guard.
    if (isSearchPage) {
      document.querySelectorAll("h2, h3, [role='heading'], p, span").forEach((title) => {
        if (title.textContent.replace(/\s+/g, " ").trim().toLowerCase() !== "other similar profiles") {
          return;
        }
        let candidate = title.parentElement;
        let rightColumn = null;
        while (candidate && candidate !== document.body) {
          if (candidate.matches("main, [role='main']") || candidate.querySelector("main, [role='main'], h1")) {
            break;
          }
          const side = candidate.getBoundingClientRect();
          if (side.width >= 160 && Array.from(candidate.parentElement?.children || []).some((sibling) => {
            if (sibling === candidate) return false;
            const results = sibling.getBoundingClientRect();
            return results.width >= 400 && results.width > side.width &&
              results.right <= side.left + 1 &&
              results.top < side.bottom && results.bottom > side.top;
          })) {
            rightColumn = candidate;
          }
          candidate = candidate.parentElement;
        }
        if (rightColumn) hideElement(rightColumn);
      });
    }

    // New layouts can use plain divs for columns. Find siblings to the right
    // of the profile column, including placeholders that have no headings yet.
    // Activity uses an h2 and may put all three columns inside main.
    // Starting at main would miss the right column inside that wrapper.
    const heading = document.querySelector(isActivityPage
      ? "main h2, [role='main'] h2"
      : "main h1, [role='main'] h1");
    const activityColumn = isActivityPage && (
      document.querySelector(".scaffold-layout__main") ||
      heading?.closest("section, .artdeco-card") || heading?.parentElement
    );
    let column = activityColumn || (isSearchPage && document.querySelector(".search-results-container")) ||
      heading?.closest("section, .artdeco-card") ||
      heading?.closest("main, [role='main']") ||
      document.querySelector("main, [role='main']");
    while (column && column !== document.body) {
      const bounds = column.getBoundingClientRect();
      if (bounds.width >= 400 && bounds.height > 0) {
        for (const sibling of column.parentElement?.children || []) {
          if (
            sibling === column ||
            sibling.matches("header, nav, [role='navigation'], [role='dialog']") ||
            sibling.querySelector("h1, main, [role='main'], [role='dialog']")
          ) {
            continue;
          }
          const side = sibling.getBoundingClientRect();
          if (
            side.width >= 160 && side.width < bounds.width && side.height > 0 &&
            side.left >= bounds.right - 1 &&
            side.top < bounds.bottom && side.bottom > bounds.top
          ) {
            hideElement(sibling);
          }
        }
      }
      column = column.parentElement;
    }
  };

  const hideLinkedInSections = () => {
    // Match the visible heading instead of LinkedIn's changing CSS classes.
    document.querySelectorAll("h2, h3, [role='heading'], p, span").forEach((heading) => {
      const title = heading.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      const isProfileSection = isProfilePage && title === "highlights";
      const isSearchFeedback = /^\/search(?:\/|$)/.test(window.location.pathname) &&
        /^are these results helpful\??$/.test(title);
      if (!isProfileSection && !isSearchFeedback) {
        return;
      }

      let container = heading.parentElement;
      while (container && container !== document.body) {
        // Never hide a page wrapper or the person's main profile card.
        if (
          container.matches("main, [role='main']") ||
          container.querySelector("h1, main, [role='main']")
        ) {
          break;
        }

        // Do not climb into the search results when locating the feedback card.
        if (isSearchFeedback && container.querySelector("a[href*='/in/'], [role='list'], ul")) {
          break;
        }

        const isTargetSection = isSearchFeedback
          ? container.querySelector("button, [role='button']")
          : container.matches("section, .artdeco-card, [role='region']") ||
            container.querySelector("button, a");
        if (isTargetSection) {
          hideElement(container);
          break;
        }
        container = container.parentElement;
      }
    });
  };

  const hideLinkedInJobPaymentBanner = () => {
    const paymentError = /there (?:was|has been) a problem processing your job posting payment/i;
    const bannerSelector = "[role='alert'], .artdeco-global-alert, .artdeco-inline-feedback";
    document.querySelectorAll(`${bannerSelector}, p, span, div`).forEach((element) => {
      const text = element.textContent.replace(/\s+/g, " ").trim();
      if (!paymentError.test(text)) {
        return;
      }
      // Start from the smallest matching text container, not a page wrapper.
      if (Array.from(element.children).some((child) =>
        paymentError.test(child.textContent.replace(/\s+/g, " "))
      )) {
        return;
      }

      let container = element;
      while (container && container !== document.body) {
        if (
          container.matches("main, nav, [role='main'], [role='navigation']") ||
          container.querySelector("h1, main, nav, [role='main'], [role='navigation']")
        ) {
          break;
        }
        if (container.matches(bannerSelector) || container.querySelector("button, [role='button']")) {
          hideElement(container);
          break;
        }
        container = container.parentElement;
      }
    });
  };

  const hideLinkedInHome = () => {
    const scopes = "nav, header, [role='navigation'], .global-nav";
    document.querySelectorAll(scopes).forEach((nav) => {
      nav.querySelectorAll("a, button, [role='link'], [role='button']").forEach((item) => {
        let isHomeLink = false;
        const href = item.getAttribute("href");
        if (href) {
          try {
            const url = new URL(href, window.location.href);
            const host = self.FocusGate.normalizeHost(url.hostname);
            isHomeLink = (host === "linkedin.com" || host.endsWith(".linkedin.com")) &&
              ["/", "/feed"].includes(url.pathname.replace(/\/+$/, "") || "/");
          } catch {
            // An invalid link cannot identify the Home navigation item.
          }
        }
        const labels = [item.getAttribute("aria-label"), item.getAttribute("title"), item.textContent];
        const isHomeLabel = labels.some((label) => /^home(?:$|[\s,.:])/i.test((label || "").trim()));
        if (!isHomeLink && !isHomeLabel) return;

        // Include the badge when it lives beside the clickable icon.
        const wrapper = item.closest("li, [role='listitem'], .global-nav__primary-item, .global-nav__item");
        hideElement(wrapper && wrapper.querySelectorAll("a, button, [role='link'], [role='button']").length === 1
          ? wrapper : item);
      });
    });
  };

  const cleanLinkedIn = () => {
    hideLinkedInHome();
    hideLinkedInRightColumn();
    hideLinkedInSections();
    hideLinkedInJobPaymentBanner();
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
      ".ad-banner-container",
      ".global-footer-compact",
      "footer"
    ]);

    hideClosestLinkedInNavItem([
      "a[href*='/feed/']",
      "a[href*='/mynetwork/']",
      "a[href*='/jobs/']",
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
      "Notifications",
      "For Business",
      "Learning",
      "Try Premium",
      "Hire with AI"
    ]);

    hideClosestNavItem(
      "nav a, nav button, [role='navigation'] a, [role='navigation'] button, header a, header button, .global-nav a",
      ["Hire with AI"]
    );
  };

  const cleanYouTube = () => {
    upsertStyle(
      "focus-gate-youtube-feed-cleanup",
      isProfilePage
        ? ""
        : "ytd-rich-grid-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer { display: none !important; }"
    );
    hideBySelector([
      "ytd-guide-renderer",
      "ytd-mini-guide-renderer",
      "#guide",
      "#chips-wrapper",
      "ytd-watch-next-secondary-results-renderer",
      "ytd-comments",
      "#secondary"
    ]);
  };

  const hideInstagramNotes = () => {
    // Notes are a separate list above the inbox, identified by its own-note label.
    document.querySelectorAll("[role='list'], ul, ol").forEach((list) => {
      const hasOwnNote = Array.from(list.querySelectorAll("span, p, [aria-label]")).some((element) =>
        [element.textContent, element.getAttribute("aria-label")].some((label) =>
          (label || "").replace(/\s+/g, " ").trim().toLowerCase() === "your note"
        )
      );
      if (
        hasOwnNote &&
        !list.querySelector("input, textarea, [contenteditable='true'], a[href*='/direct/t/']")
      ) {
        // Notes sit inside wrappers with their own height and padding.
        // Collapse the outer notes-only wrapper, stopping before inbox content.
        let container = list;
        let parent = container.parentElement;
        while (parent && !parent.matches("body, main, [role='main'], [role='dialog']")) {
          const children = Array.from(parent.children).filter((child) =>
            !child.matches("script, style")
          );
          const hasOwnText = Array.from(parent.childNodes).some((node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent.trim()
          );
          if (children.length !== 1 || children[0] !== container || hasOwnText) {
            break;
          }
          container = parent;
          parent = container.parentElement;
        }
        hideElement(container);
      }
    });
  };

  const hideInstagramNavigation = () => {
    const hiddenLabels = new Set([
      "home", "reels", "notifications", "also from meta", "instagram"
    ]);
    // Instagram's sidebar uses ordinary divs, not always a nav element.
    document.querySelectorAll("a[href], button, [role='button'], [role='link']").forEach((item) => {
      if (item.closest("[role='dialog'], [role='log'], [contenteditable='true']")) {
        return;
      }
      const labels = [item.getAttribute("aria-label"), item.getAttribute("title"), item.textContent];
      item.querySelectorAll("svg[aria-label], img[alt], svg title").forEach((icon) => {
        labels.push(icon.getAttribute("aria-label"), icon.getAttribute("alt"), icon.textContent);
      });
      const matchesLabel = labels.some((label) =>
        hiddenLabels.has((label || "").replace(/\s+/g, " ").trim().toLowerCase())
      );
      if (!matchesLabel) {
        return;
      }
      const href = item.getAttribute("href");
      if (href) {
        try {
          const url = new URL(href, window.location.href);
          const path = url.pathname.replace(/\/+$/, "") || "/";
          const host = self.FocusGate.normalizeHost(url.hostname);
          if (
            host !== "instagram.com" ||
            !["/", "/reels", "/accounts/activity", window.location.pathname.replace(/\/+$/, "")].includes(path)
          ) {
            return;
          }
        } catch {
          return;
        }
      }
      hideElement(item);
    });
  };

  const cleanInstagram = () => {
    hideInstagramNavigation();
    const isDirectPage = /^\/direct(?:\/|$)/.test(window.location.pathname);
    if (isDirectPage) {
      hideInstagramNotes();
    }

    hideBySelector([
      "nav a[href='/']",
      "nav a[href='/reels/']",
      "nav a[href='/explore/']",
      "nav a[href='/create/select/']",
      "nav a[href^='/accounts/activity/']"
    ]);

    upsertStyle(
      "focus-gate-instagram-feed-cleanup",
      isDirectPage || isProfilePage
        ? ""
        : "aside, main section, main article { display: none !important; }"
    );

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

  const cleanVK = () => {
    const allowedLabels = new Set([
      "профиль", "мессенджер", "друзья", "сообщества",
      "profile", "my profile", "messenger", "messages", "friends", "communities"
    ]);
    const allowedIds = new Set(["l_pr", "l_msg", "l_fr", "l_gr"]);
    const labelFor = (link) => (
      link.querySelector(".left_label, .LeftMenu__itemLabel")?.textContent ||
      link.getAttribute("aria-label") || link.textContent || ""
    ).replace(/\s+/g, " ").replace(/\s*\d+\+?$/, "").trim().toLowerCase();

    document.querySelectorAll("#side_bar, #side_bar_inner, .LeftMenu, nav, [role='navigation'], aside").forEach((menu) => {
      // Generic containers must have the VK sidebar's allowed destinations.
      if (!menu.matches("#side_bar, #side_bar_inner, .LeftMenu")) {
        const found = new Set(Array.from(menu.querySelectorAll("a[href]")).map(labelFor));
        if (!["друзья", "friends"].some((label) => found.has(label)) ||
            !["мессенджер", "messenger", "messages"].some((label) => found.has(label))) {
          return;
        }
      }
      menu.querySelectorAll("a[href]").forEach((link) => {
        const row = link.closest("li, .left_menu_item, .LeftMenu__item");
        const knownItem = link.closest("[id^='l_']");
        if (allowedIds.has(knownItem?.id) || allowedLabels.has(labelFor(link))) {
          return;
        }
        hideElement(row && menu.contains(row) && row.querySelectorAll("a[href]").length === 1
          ? row : link);
      });
      menu.querySelectorAll("hr, [role='separator'], .more_div, .left_menu_separator").forEach(hideElement);
    });
  };

  const cleaners = {
    x: cleanX,
    linkedin: cleanLinkedIn,
    youtube: cleanYouTube,
    instagram: cleanInstagram,
    vk: cleanVK
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

    isProfilePage = self.FocusGate.isProfileUrl(window.location.href, site);

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

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "focus-gate:url-changed") {
      scheduleSiteRules();
    }
  });
  window.addEventListener("popstate", scheduleSiteRules);
  window.addEventListener("resize", scheduleSiteRules);
  applySiteRules();
  document.addEventListener("DOMContentLoaded", scheduleSiteRules);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
