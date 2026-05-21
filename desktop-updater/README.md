## Desktop Updater Feed

This directory hosts the stable update manifest consumed by the packaged desktop app.

- `latest.json` is generated from GitHub Release assets.
- `.github/workflows/release-desktop.yml` refreshes this file after each desktop release.
- Desktop builds read this manifest from `raw.githubusercontent.com` first, with `jsDelivr` as a fallback.

Do not edit `latest.json` by hand unless you are intentionally repairing the updater feed.
