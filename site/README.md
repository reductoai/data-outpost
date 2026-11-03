# Site

This folder contains the complete browser interface. Run it from the repository root with:

```bash
npm run dev
```

The interface reads property metadata from `data/houses.json` and saved Reducto output metadata from `data/reducto/index.json`. When `REDUCTO_API_KEY` or the Reducto CLI is configured, `scripts/serve.mjs` also exposes same-origin status and parse routes for the live upload experience.

No build step or third-party JavaScript dependency is required.
