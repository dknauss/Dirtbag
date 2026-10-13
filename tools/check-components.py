#!/usr/bin/env python3
"""Validate repository-owned component contracts; standard library only.
Canonical source: Ollie Child Kit tools/check-components.py.
Run from the repository root: python3 tools/check-components.py
"""
import json
import re
import sys
from pathlib import Path


def discover(root, scopes):
    found = {}
    for scope in scopes:
        base = root / scope
        for p in base.rglob('*'):
            if not p.is_file():
                continue
            rel = p.relative_to(root).as_posix()
            parts = p.relative_to(base).parts
            if any(x in parts for x in ('node_modules', 'vendor', '.git', 'build', 'dist', 'packages', 'tests', 'output', 'outputs', 'archive', '.planning', '__pycache__')):
                continue
            if p.name == 'block.json':
                found[rel] = 'block'
            elif p.name == 'theme.json':
                found[rel] = 'design'
            elif p.suffix == '.php' and 'patterns' in parts:
                found[rel] = 'pattern'
            elif p.suffix == '.html' and any(x in parts for x in ('templates', 'parts')):
                found[rel] = 'template'
            elif p.suffix == '.twig':
                found[rel] = 'view'
            elif p.suffix == '.json' and any(x in parts for x in ('styles', 'palettes')):
                found[rel] = 'variation'
    return found


def validate(root):
    contract = json.loads((root / 'components.json').read_text())
    errors = []
    if contract.get('version') != 1:
        errors.append('unsupported contract version')
    for scope in contract['scopes']:
        if not (root / scope).resolve().is_relative_to(root.resolve()):
            return ['unsafe discovery scope: ' + scope]
    discovered = discover(root, contract['scopes'])
    entries = contract['components']
    paths = [c['source'] for c in entries]
    if len(paths) != len(set(paths)):
        errors.append('duplicate component source')
    if set(discovered) != {c['source'] for c in entries if c['kind'] not in ('service', 'php-block')}:
        errors.append('inventory drift: ' + str(sorted(set(discovered).symmetric_difference(
            c['source'] for c in entries if c['kind'] not in ('service', 'php-block')))))
    for c in entries:
        if c['source'] in discovered and c['kind'] != discovered[c['source']]:
            errors.append(c['source'] + ': component kind drift')
        p = root / c['source']
        if not p.resolve().is_relative_to(root.resolve()) or not p.is_file():
            errors.append(c['source'] + ': missing or unsafe source path')
            continue
        for key in ('id', 'kind', 'design_owner', 'data_owner', 'editable', 'updates', 'verification'):
            if not c.get(key):
                errors.append(c['source'] + ': missing ' + key)
        if c['kind'] in ('design', 'variation', 'block'):
            meta = json.loads(p.read_text())
            if c['kind'] == 'block':
                if c['id'] != meta.get('name'):
                    errors.append(c['source'] + ': block name drift')
                for key in ('attributes', 'supports'):
                    if c.get(key, {}) != meta.get(key, {}):
                        errors.append(c['source'] + ': ' + key + ' drift; review editable-field contract')
        if c['kind'] == 'pattern':
            text = p.read_text()
            slug = re.search(r'^\s*\*\s*Slug:\s*(.+)$', text, re.M)
            if not slug or c['id'] != slug.group(1).strip():
                errors.append(c['source'] + ': pattern slug drift')
            if c.get('content_only'):
                group = re.search(r'<!-- wp:group (\{[^\n]+\}) -->', text)
                if not group or json.loads(group.group(1)).get('templateLock') != 'contentOnly':
                    errors.append(c['source'] + ': managed pattern lost contentOnly layout lock')
        for linked in c.get('references', []):
            if not (root / linked).is_file():
                errors.append(c['source'] + ': missing reference ' + linked)
    return errors


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    try:
        errors = validate(root)
    except (KeyError, ValueError, OSError) as exc:
        errors = [str(exc)]
    for error in errors:
        print('FAIL ' + error, file=sys.stderr)
    if errors:
        sys.exit(1)
    print('Component ownership, sources, fields, supports and managed locks agree.')
