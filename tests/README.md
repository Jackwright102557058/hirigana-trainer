# Mode Atlas smoke tests

These tests use Playwright against the static app.

## First-time setup

```bash
npm install
npx playwright install
```

## Run smoke tests

```bash
npm run test:smoke
```

## Run headed

```bash
npm run test:headed
```

The Playwright config starts a local static server with:

```bash
python3 -m http.server 4173
```

The tests seed stable localStorage state before each run so Reading/Writing flows are predictable and do not depend on the tester's real browser save data.

## Container note

This config can use a system Chromium when `npx playwright install` is not available:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:smoke
```

On normal local machines, prefer the standard Playwright browser install.
