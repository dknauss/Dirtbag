# Contributing to Dirtbag

For reproducible bugs, small improvements, and private security reports, start
with [Support](SUPPORT.md). Keep changes consistent with Dirtbag's constraints:
no required build step, remote assets, or bundled web fonts. The sole theme-authored
front-end script handles table keyboard access; further JavaScript needs a clear
accessibility or interaction requirement and a usable fallback. The [development guide](docs/development.md) explains the
architecture, local workflow, translations, and release conventions.

## Make a change

1. Create a focused branch from current `main` and open a pull request using the
   repository's PR template. Explain the resulting behavior and relevant checks.
2. Run `bin/package-check` from the repository root. For component-contract
   changes, also run `python3 tools/check-components.py`; see the
   [component workflow](docs/COMPONENT-WORKFLOW.md).
3. Follow the [testing guide](docs/testing.md) and
   [Playwright setup](tests/README.md) for browser checks. Rendered changes need
   WordPress/Playground verification; template and style changes also need the
   relevant frontend and editor checks.

GitHub requires a pull request and passing `package-check` before merging into
`main`. Component checks and the smoke/accessibility and seven-style browser
jobs provide additional validation; inspect all applicable results before merging.
CI uses disposable, seeded Playground sites. The regular Studio site is an
**authoring workbench**: do not wipe or reseed it to run tests. See the development
guide for the content-export direction and safe disposable previews.

## Attribute contributions accurately

Enable the repository's local commit-message hook once per clone:

```sh
git config core.hooksPath .githooks
```

The hook expects a `Co-Authored-By: Name <email>` trailer on ordinary commits.
Name the actual collaborator or assisting model; do not copy an attribution for
someone who did not contribute. This records collaboration, not cryptographic
signing. Git-generated merge/squash messages are exempt. For a genuinely
human-only commit, the hook explicitly permits `git commit --no-verify`; use that
exception deliberately, not to omit attribution for assisted work. Local hooks
are opt-in and do not replace CI or review.

For a bug report, include the WordPress/PHP and theme versions, reproduction
steps, and browser or assistive-technology details when relevant. Report any real
accessibility failure with the affected page and axe output; preserve the
existing accessibility gates.
