# Nursery Admin — Mobile App

React Native admin app built with the same stack as the Rusher project.

## Stack / Tools

- **Expo** SDK 54 (managed workflow)
- **expo-router** ~6 — file-based routing, entry is `expo-router/entry`. Routes live in `app/`.
- **React Native** 0.81.5 / **React** 19
- **react-native-paper** ^5 (MD3) — UI component library. Theme is wired in `app/_layout.jsx` from `constants/theme.js`.
- **Montserrat** fonts via `@expo-google-fonts/montserrat`, loaded with `expo-font` in the root layout.
- **react-native-svg** + **react-native-svg-transformer** — import `.svg` files as components (configured in `metro.config.js`). Ready for Figma SVG exports.
- **@react-native-async-storage/async-storage** — session/token persistence.
- Language: **JavaScript** (`.jsx` / `.js`), no TypeScript.

## Project structure

- `app/` — expo-router routes (`_layout.jsx` is the root layout with providers).
- `components/` — reusable UI components.
- `config/` — `api.js` (fetch wrapper + `BASE_URL`, token getter).
- `constants/` — `theme.js` (design tokens: Colors, Fonts, Spacing, Radii, paperTheme).
- `context/` — `AuthContext.js`, `DataContext.js` (app-wide state via React Context).
- `services/` — backend API call modules (one per domain), built on `config/api.js`.
- `hooks/` — custom hooks.

## Conventions

- API calls go through `apiRequest()` in `config/api.js`; the `Authorization` header is attached automatically from `AuthContext` via `setTokenGetter`.
- Design tokens in `constants/theme.js` are placeholders until the real values are pulled from Figma.
- Add new global data domains to `DataContext`, new API domains as files in `services/`.

## Run

```
npm install
npm start        # expo dev server
npm run android  # build + run on Android
npm run ios      # build + run on iOS
```
