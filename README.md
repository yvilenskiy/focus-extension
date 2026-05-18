# Focus Gate

Focus Gate is a Chrome Manifest V3 extension for deliberate entry into distracting websites.

When you open a configured website, the page is blocked by a full-screen prompt:

- **I want to waste time** closes the current tab.
- **Continue for work** appears as a small link in a random place on the screen. Clicking it unlocks that tab and opens the configured default page.

The extension ships with defaults for:

- X: opens `https://x.com/messages` and hides distracting navigation items.
- LinkedIn: opens `https://www.linkedin.com/search/results/people/`, hides selected navigation and sidebar surfaces, and rewrites `/mynetwork/grow/` links to `https://www.linkedin.com/mynetwork/invite-connect/connections/`.
- YouTube: opens `https://www.youtube.com/feed/subscriptions` and hides the feed/sidebar surfaces so the top navbar stays available. `music.youtube.com` is excluded.
- Instagram: opens `https://www.instagram.com/direct/inbox/` and hides distracting navigation and feed surfaces.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Configure websites

Open the extension options page from `chrome://extensions` or the extension popup.

Each configured website has:

- A website URL or host to match.
- A default URL to open after the work link is clicked.
- Optional built-in cleanup rules for X, LinkedIn, YouTube, and Instagram.

Custom websites use the same gate behavior without site-specific cleanup rules.

## GitHub

This folder is ready to become its own GitHub repository. Initialize it with:

```bash
git init
git add .
git commit -m "Initial Focus Gate extension"
```

Then create a GitHub repository and add it as `origin`.
