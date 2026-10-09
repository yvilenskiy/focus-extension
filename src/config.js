(() => {
  const CONFIG_KEY = "focusGateConfig";

  const DEFAULT_SITES = [
    {
      id: "x",
      label: "X",
      enabled: true,
      matchHosts: ["x.com"],
      defaultUrl: "https://x.com/messages",
      homePaths: ["/", "/home"],
      siteRules: ["x"]
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      enabled: true,
      matchHosts: ["linkedin.com"],
      defaultUrl: "https://www.linkedin.com/search/results/people/",
      homePaths: ["/", "/feed", "/feed/"],
      siteRules: ["linkedin"]
    },
    {
      id: "youtube",
      label: "YouTube",
      enabled: true,
      matchHosts: ["youtube.com"],
      excludedHosts: ["music.youtube.com"],
      defaultUrl: "https://www.youtube.com/feed/subscriptions",
      homePaths: ["/"],
      siteRules: ["youtube"]
    },
    {
      id: "instagram",
      label: "Instagram",
      enabled: true,
      matchHosts: ["instagram.com"],
      defaultUrl: "https://www.instagram.com/direct/inbox/",
      homePaths: ["/"],
      siteRules: ["instagram"]
    },
    {
      id: "vk",
      label: "VK",
      enabled: true,
      matchHosts: ["vk.ru"],
      defaultUrl: "https://vk.ru/im",
      homePaths: ["/", "/feed"],
      siteRules: ["vk"]
    }
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const normalizeHost = (host) =>
    host.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");

  const normalizeUrl = (value) => {
    try {
      const trimmed = value.trim();
      const rawUrl = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
      return new URL(rawUrl).toString();
    } catch {
      return null;
    }
  };

  const normalizePath = (path) => path.replace(/\/+$/, "") || "/";

  const normalizeSite = (site) => ({
    id: String(site.id),
    label: String(site.label || site.id),
    enabled: site.enabled !== false,
    matchHosts: Array.isArray(site.matchHosts)
      ? site.matchHosts.map(normalizeHost).filter(Boolean)
      : [],
    excludedHosts: Array.isArray(site.excludedHosts)
      ? site.excludedHosts.map(normalizeHost).filter(Boolean)
      : [],
    defaultUrl: normalizeUrl(String(site.defaultUrl || "")) || "",
    homePaths: Array.isArray(site.homePaths)
      ? site.homePaths.map(normalizePath)
      : ["/"],
    siteRules: Array.isArray(site.siteRules) ? site.siteRules : []
  });

  const mergeConfig = (config) => {
    const defaultsById = new Map(
      DEFAULT_SITES.map((site) => [site.id, normalizeSite(site)])
    );
    const sites = Array.isArray(config?.sites)
      ? config.sites.map((site) => {
          const defaultSite = defaultsById.get(String(site.id));

          if (!defaultSite) {
            return normalizeSite(site);
          }

          return normalizeSite({
            ...defaultSite,
            ...site,
            excludedHosts: site.excludedHosts ?? defaultSite.excludedHosts,
            // Earlier VK configs shipped with redirect-only rules.
            siteRules: defaultSite.id === "vk" && site.siteRules?.length === 0
              ? defaultSite.siteRules
              : site.siteRules ?? defaultSite.siteRules
          });
        })
      : [];
    const ids = new Set(sites.map((site) => site.id));

    for (const site of DEFAULT_SITES) {
      if (!ids.has(site.id)) {
        sites.push(normalizeSite(site));
      }
    }

    return { version: 1, sites };
  };

  const loadConfig = async () => {
    const result = await chrome.storage.sync.get(CONFIG_KEY);
    return mergeConfig(result[CONFIG_KEY]);
  };

  const saveConfig = async (config) => {
    await chrome.storage.sync.set({
      [CONFIG_KEY]: mergeConfig(config)
    });
  };

  const hostMatches = (site, url) => {
    const currentHost = normalizeHost(url.hostname);
    const isExcluded = site.excludedHosts.some((host) => {
      const excludedHost = normalizeHost(host);
      return currentHost === excludedHost || currentHost.endsWith(`.${excludedHost}`);
    });

    if (isExcluded) {
      return false;
    }

    return site.matchHosts.some((host) => {
      const expectedHost = normalizeHost(host);
      return currentHost === expectedHost || currentHost.endsWith(`.${expectedHost}`);
    });
  };

  const matchSite = (rawUrl, config) => {
    let url;

    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return (
      config.sites.find((site) => site.enabled && hostMatches(site, url)) || null
    );
  };

  const isHomeUrl = (rawUrl, site) => {
    try {
      const url = new URL(rawUrl);
      return site.homePaths.some((path) => normalizePath(path) === normalizePath(url.pathname));
    } catch {
      return false;
    }
  };

  // These sites use single-segment paths for both profiles and app routes.
  const X_ROUTES = new Set([
    "about", "account", "accounts", "articles", "bookmarks", "chat", "communities",
    "compose", "connect_people",
    "download", "explore", "grok", "help", "home", "i", "intent", "jobs", "lists", "login",
    "logout", "messages", "notifications", "oauth", "premium", "privacy", "search",
    "settings", "share", "signup", "tos", "topics", "welcome", "who_to_follow"
  ]);
  const INSTAGRAM_ROUTES = new Set([
    "about", "accounts", "ads", "api", "challenge", "create", "developer",
    "developers", "direct", "directory", "emails", "explore", "legal",
    "oauth", "p", "press", "privacy", "push", "reel", "reels", "session",
    "settings", "static", "stories", "terms", "tv", "web", "your_activity"
  ]);

  const isProfileUrl = (rawUrl, site) => {
    try {
      const url = new URL(rawUrl);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        !hostMatches(site, url)
      ) {
        return false;
      }

      const host = normalizeHost(url.hostname);
      const path = normalizePath(url.pathname);
      const onHost = (domain) => host === domain || host.endsWith(`.${domain}`);

      if (onHost("linkedin.com")) {
        // Keep every activity tab accessible as part of the person’s profile.
        return /^\/in\/[^/]+(?:\/recent-activity(?:\/[^/]+)?)?$/.test(path);
      }
      if (onHost("x.com") || onHost("twitter.com")) {
        return /^\/[a-zA-Z0-9_]{1,15}$/.test(path) &&
          !X_ROUTES.has(path.slice(1).toLowerCase());
      }
      if (onHost("instagram.com")) {
        return /^\/[a-zA-Z0-9_.]{1,30}$/.test(path) &&
          !INSTAGRAM_ROUTES.has(path.slice(1).toLowerCase());
      }
      if (onHost("youtube.com")) {
        return /^\/(?:@[^/]+|channel\/UC[a-zA-Z0-9_-]{22}|(?:c|user)\/[^/]+)$/.test(path);
      }
      return false;
    } catch {
      return false;
    }
  };

  const createSite = (label, siteUrl, defaultUrl) => {
    const source = normalizeUrl(siteUrl);
    const target = normalizeUrl(defaultUrl);

    if (!source || !target) {
      throw new Error("Enter valid website and default URLs.");
    }

    const sourceUrl = new URL(source);
    const host = normalizeHost(sourceUrl.hostname);
    const idHost = host.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    return normalizeSite({
      id: `custom-${idHost}-${Date.now()}`,
      label: label.trim() || host,
      enabled: true,
      matchHosts: [host],
      defaultUrl: target,
      homePaths: ["/"],
      siteRules: []
    });
  };

  self.FocusGate = {
    CONFIG_KEY,
    DEFAULT_SITES: clone(DEFAULT_SITES),
    createSite,
    isHomeUrl,
    isProfileUrl,
    loadConfig,
    matchSite,
    normalizeHost,
    normalizeSite,
    normalizeUrl,
    saveConfig
  };
})();
