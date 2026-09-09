# Polylex — translator & dictionary

A two-mode app: translate text between ~25 languages, and look up English
word definitions, phonetics, pronunciation audio, and synonyms. Built as a
plain HTML/CSS/JS web app, wrapped into an installable Android app with
[Capacitor](https://capacitorjs.com), and built into an APK automatically by
a GitHub Actions workflow already included in this repo.

Needs an internet connection to work — translations and definitions are
fetched live from two free, keyless APIs:
- Translation: [MyMemory](https://mymemory.translated.net/doc/spec.php)
- Dictionary: [dictionaryapi.dev](https://dictionaryapi.dev) (English only)

## 1. Put this on GitHub

```bash
cd polylex
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

No GitHub CLI? Create an empty repo on github.com first (don't add a
README there), then run the commands above with that repo's URL.

## 2. Let GitHub Actions build the APK

The workflow at `.github/workflows/build-apk.yml` runs automatically on
every push to `main` — no local Android Studio or SDK needed. To get the
APK:

1. Push to `main` (step 1 above already triggers this).
2. On GitHub, open the **Actions** tab → the latest **Build Android APK**
   run → wait for the green check.
3. Scroll to **Artifacts** and download `polylex-debug-apk`. It's a zip
   containing `app-debug.apk`.

If you'd rather have a permanent download link instead of an Actions
artifact (artifacts expire after 90 days), tag a release instead:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This runs the same build and additionally publishes the APK on your
repo's **Releases** page, where the link stays live indefinitely.

You can also trigger a build manually any time from the Actions tab via
**Run workflow** (no push needed).

## 3. Install it on your phone

1. Download `app-debug.apk` to your Android phone (or transfer it over).
2. Tap the file. Android will prompt to allow installs from that source
   the first time — allow it, then continue the install.
3. This is a debug build, so Android will show an "unverified app"
   notice; that's expected for an app built outside the Play Store.

## Project layout

```
www/                     the actual web app (edit this)
  index.html
  css/style.css
  js/app.js
  manifest.json, sw.js    PWA manifest + offline app-shell cache
  icons/                  app icons (192/512/maskable)
resources/
  icon.png, splash.png    1024×1024 / 2732×2732 source art —
                          regenerate Android icons from these with:
                          npx capacitor-assets generate --android
android/                  native Android project (committed, per
                          Capacitor's convention — don't hand-edit
                          generated files under app/build/)
capacitor.config.json     app id, app name, which folder is the web app
.github/workflows/        the APK build pipeline
```

## Making changes

Edit files under `www/`, commit, and push — the next Actions run picks
up the changes automatically (the workflow re-runs `cap sync` before
building). To test in a browser first: `cd www && python3 -m http.server`.

## Customizing

- **App name / package id** — edit `appName` / `appId` in
  `capacitor.config.json`. If you change `appId`, delete the `android/`
  folder and run `npx cap add android` again (see below) so the native
  project regenerates under the new id.
- **Default languages** — in `www/js/app.js`, change `"en"` / `"bn"` in
  `populateLangSelects()`.
- **Icon / splash** — replace `resources/icon.png` (1024×1024) and
  `resources/splash.png` (2732×2732), then run:
  ```bash
  npm install
  npx capacitor-assets generate --android
  ```
- **Higher translation quota** — MyMemory's anonymous limit is around
  5,000 words/day. Append `&de=youremail@example.com` to the request URL
  in `runTranslate()` in `app.js` to raise it to ~50,000 words/day.

## Local dev commands (optional)

Only needed if you want to build the APK on your own machine instead of
via GitHub Actions; requires Android Studio / the Android SDK installed
locally:

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
# APK at android/app/build/outputs/apk/debug/app-debug.apk
```
