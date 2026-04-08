# Release Checklist

This checklist is for the first public release of `humming`.

Current repository snapshot on 2026-04-08:

- core runtime is in place
- official plugins now include `auth`, `cache`, `cors`, `metrics`, `rate-limit`, `request-logger`, `options-static`, and `options-http`
- examples exist for `basic`, `with-plugins`, `with-forward`, and `with-async-plugin`
- CI exists in `.github/workflows/ci.yml`
- package metadata and dual license files are present
- tests and typecheck are expected to pass before release

## 1. Decide Release Scope

- [ ] Confirm whether the first public release is:
  - GitHub source release only
  - GitHub release plus npm publish for Bun users
- [ ] Confirm the version number for first release, for example `0.1.0`
- [ ] Confirm the release promise:
  - Bun-first package
  - plugin-first lightweight BFF core
  - not a full API gateway replacement

## 2. Repository Hygiene

- [ ] `git status --short` is clean or only contains intentional release changes
- [ ] remove local-only files and editor noise
- [ ] verify `bun.lock` is current and clean
- [ ] verify logo and brand assets referenced by `README.md` render correctly on GitHub

## 3. Quality Gate

- [ ] run `bun run typecheck`
- [ ] run `bun test`
- [ ] smoke run examples:
  - [ ] `bun run example:basic`
  - [ ] `bun run example:with-plugins`
  - [ ] `bun run example:with-forward`
  - [ ] `bun run example:with-async-plugin`
- [ ] manually verify key endpoints:
  - [ ] `/health`
  - [ ] `/metrics`
  - [ ] `/api/options`
  - [ ] auth-protected route
  - [ ] rate-limited route
  - [ ] cached route
  - [ ] forward route

## 4. Docs Gate

- [ ] `README.md` works as landing page
- [ ] `CHANGELOG.md` reflects the first release scope
- [ ] `RELEASE_NOTES_v0.1.0.md` is ready to paste into GitHub Release
- [ ] quick start commands are copy-paste runnable
- [ ] plugin example commands match the actual example behavior
- [ ] `PLUGIN_GUIDE.md` matches current plugin APIs
- [ ] examples have short README files where needed
- [ ] confirm license wording is consistent:
  - `MIT OR Apache-2.0`

## 5. Package Gate

Use this section only if you want to publish to npm.

- [ ] confirm package name `humming` is actually available on npm
- [ ] review `package.json` fields:
  - [ ] `name`
  - [ ] `version`
  - [ ] `description`
  - [ ] `repository`
  - [ ] `homepage`
  - [ ] `bugs`
  - [ ] `license`
  - [ ] `files`
  - [ ] `engines.bun`
- [ ] run `npm pack --dry-run` or `bun pm pack` and inspect included files
- [ ] verify the package tarball contains:
  - [ ] `index.ts`
  - [ ] `src/`
  - [ ] `README.md`
  - [ ] `LICENSE-MIT`
  - [ ] `LICENSE-APACHE`
- [ ] smoke test package consumption in a fresh Bun project
- [ ] decide whether source-only TypeScript export is acceptable for the first release

## 6. Release Notes

- [ ] write a short release summary
- [ ] update `CHANGELOG.md`
- [ ] update `RELEASE_NOTES_v0.1.0.md`
- [ ] list core scope clearly:
  - lightweight BFF core
  - health in core
  - options in core
  - forward terminal in core
  - plugin-first extension model
- [ ] list official plugins shipped in first release
- [ ] list known non-goals or not-yet-shipped areas

Suggested first release note outline:

- what `humming` is
- why it exists
- what is stable in `0.1.x`
- what is intentionally still small
- what users should try first

## 7. GitHub Release Steps

- [ ] merge or commit the final release changes
- [ ] create annotated tag, for example `v0.1.0`
- [ ] push branch and tag
- [ ] create GitHub Release from the tag
- [ ] use the release summary from section 6
- [ ] attach any screenshots only if they add value

## 8. Post-Release Follow-Up

- [ ] verify the GitHub README renders correctly after publish
- [ ] verify examples still match the tagged release
- [ ] open a short roadmap issue for next milestone
- [ ] collect first-user feedback before widening scope

## Recommended First Release Boundary

Recommended baseline for `v0.1.0`:

- include current core runtime
- include official plugins already implemented
- include examples and plugin guide
- include CI and dual license
- do not expand scope further before first tag unless the change is clearly release-blocking

Recommended next milestone after first release:

- packaging polish
- release automation
- changelog discipline
- deployment recipes
- more production guidance around Redis and metrics scraping
