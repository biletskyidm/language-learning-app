# 34: App icon and PhraseLoop name

**What to build:** App ships with the default Expo icon and "Language Learning" name. Give it the PhraseLoop logo and name on the home screen.

- `app/assets/icon.png`: 1024×1024, no alpha — PhraseLoop logo (speech bubble + book + stars) at 80% on dark `#1C1C1E`.
- `app/app.json`: `"icon": "./assets/icon.png"`, `"name": "PhraseLoop"`. Slug, scheme and bundle id unchanged.

- [x] sim: home screen shows the new icon labelled "PhraseLoop".
