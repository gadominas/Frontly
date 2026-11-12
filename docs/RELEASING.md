# Releasing Frontly

1. Make the change in `Frontly.js` and bump `const VERSION = '…';` (one line, single quotes).
2. Run the tests (see [TESTING.md](TESTING.md)): lint, every pack and every scenario must pass.
3. Add the release at the top of `releases.json`: version, date, title, three user-facing highlights, changes and fixes. Run `node tools/changelog.js` to regenerate `CHANGELOG.md`.
4. If a blueprint was applied or upgraded, update the `BLUEPRINTS` block, regenerate `BLUEPRINT_ABOUT` (`node tools/about.js --write ../Frontly/Frontly.js` in app-blueprints) and `docs/BLUEPRINTS.md`, in the same commit as the code.
5. Commit the script first and `releases.json` last, so the update offer never appears before the new script exists.
6. Tag that last commit with the bare version, annotated (`git tag -a 1.1.0 -m "Frontly 1.1.0"`), and push the commit and the tag.

Screenshots and the banner are regenerated with [repo-site](https://github.com/gadominas/app-blueprints/tree/main/repo-site) from `docs/site/scenario.js` and `docs/site/header.json`.
