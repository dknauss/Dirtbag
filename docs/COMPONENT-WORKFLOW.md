# Design in Git, editorial data in WordPress

Repository files own templates, wrappers, typography, palette presets, rendering and
behavior. WordPress owns post copy, links, media, configured identity and plugin records.
Each repository's `components.json` and `docs/COMPONENTS.md` identify the boundary.

## Choose the smallest native primitive

- Use templates and parts for site structure. Database overrides must be reviewed and
  either deliberately retained or reconciled to Git before deploying structural changes.
- Use ordinary patterns for editable starting layouts. Inserted instances are detached;
  changing the PHP file does not migrate existing post content.
- Use content-only group patterns for branded calls to action with editable text and
  links but protected arrangement. This is an editor affordance, not authorization;
  privileged users and APIs can bypass it. Existing instances keep their old settings.
- Use dynamic plugin blocks for reusable behavior or live records. Keep presentation in
  code and source values in attributes or the plugin's public data API.
- Keep static blocks static when saved markup must survive deactivation. Design changes
  need compatibility/deprecation handling; do not rewrite saved content on activation.
- Keep ACF/Timber views in Git and ACF field definitions alongside them. Do not replace
  that stack merely to imitate block themes.

## Define the editing contract before changing a component

Record its source, editable fields, data owner, available style controls, update behavior
and verification. `attributes` and `supports` in block contracts describe the declared
interface, not a guarantee every attribute has a visible editor control. Consult the
block's edit code. Nested citation records and ACF fields require their own documented
rules. Never claim layout protection for an unlocked starter pattern.

Controls already offered by a public block remain available. Narrowing that API needs a
separate compatibility decision. For future managed instances agree the permitted
fields and variants first; do not globally disable the Site Editor for developers.

## Review and release

1. Change source and contract together. Run `python3 tools/check-components.py` and the
   repo's existing checks. Commit source, contracts and any required build artifacts.
2. Audit the target using `tools/audit-design-overrides.php` through a read-only WP-CLI
   operation. Read the authoritative machine policy and access inventory first. IDs and
   slugs suffice for the first audit; do not export a production database into Git.
3. Review overrides. A saved style variation is not automatically unwanted drift.
   Export an intended design change into source, then reconcile the database only with
   explicit production approval. Never automatically delete overrides.
4. Test editing allowed fields, protected layout, frontend output, deactivation behavior,
   and whether a code update preserves values. Validate against the supported WP floor.
5. Deploy files only when appropriate, preserving production editorial data. Production
   writes require explicit per-command approval. Marginalia pushes are Mac-mini-only.
6. Verify the live component and its configured values with read-only access.

## Shared tooling

`tools/check-components.py` and `tools/audit-design-overrides.php` are maintained here
and distributed unchanged to component-owning repos so public CI never needs access to
this private repository. The checker is Python 3.9+ standard library only. Copies are
reviewed together; they are not a WordPress runtime dependency.

Checks detect added/removed components, missing sources/references, block name and
attribute/support changes, pattern slug changes, and missing managed-pattern locks.
They do not prove editor UI behavior, PHP rendering correctness, authorization, frontend
accessibility, or the absence of database overrides. Those require site verification.

For a multi-repository local review, run the kit’s
`python3 tools/check-workspace-components.py --workspace /Users/dan-knauss/Code`.
It validates installed contracts and detects divergence in the shared tooling copies.
It is a local workspace check, not a private dependency for public CI.
