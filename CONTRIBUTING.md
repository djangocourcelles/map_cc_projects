# Contributing to Map CC Projects

Thank you for your interest in contributing!

## Reporting issues

Open an issue at https://github.com/djangocourcelles/map_cc_projects/issues with:
- Your OS and Node.js version
- Steps to reproduce
- Expected vs actual behaviour

## Submitting a pull request

1. Fork the repository
2. Create a branch: `git checkout -b fix/my-fix` or `feat/my-feature`
3. Make your changes — keep the zero-build-step constraint (no Webpack, Vite, etc.)
4. Test locally: `node server.js`
5. Open a PR against `main`

## Code conventions

- Vanilla JS only on the frontend — no frameworks
- Node.js native modules preferred over npm packages
- All comments and commit messages in English or French
- No breaking changes to the `WORKSPACE` env var contract

## Running locally

```bash
npm install
node server.js
# → http://localhost:3000
```

To use a custom workspace:

```bash
WORKSPACE=/path/to/your/projects node server.js
```
