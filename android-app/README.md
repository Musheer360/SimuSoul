# SimuSoul Android App

This Android app wraps the SimuSoul web application in a native WebView container. The web app files are bundled directly in the APK, so everything runs locally - only the Gemini API calls go to the internet.

## Features

- **Fully local**: All web app files are bundled in the APK
- **Native performance**: Uses Android WebView with hardware acceleration
- **Dark theme support**: Respects the web app's theme settings
- **IndexedDB support**: All data is stored locally on the device
- **Full offline functionality**: Works without internet (except for AI chat which requires API calls)

## Requirements

- Android 8.0+ (API 26)
- JDK 17 for building
- Node.js 20+ for building

## Building the APK

### Using GitHub Actions (Recommended)

1. Go to the **Actions** tab in the repository
2. Select **Build Android APK** workflow
3. Click **Run workflow**
4. Download the APK from the artifacts

### Building Locally

1. First, build the static web export:
   ```bash
   npm ci
   npm run build
   ```

2. Copy the web files to the Android assets folder:
   ```bash
   cp -r out/* android-app/app/src/main/assets/www/
   ```

3. Build the APK:
   ```bash
   cd android-app
   ./gradlew assembleDebug
   ```

4. The APK will be at `android-app/app/build/outputs/apk/debug/app-debug.apk`

## How It Works

1. The web app is built as a static export using Next.js
2. The static files (HTML, CSS, JS) are bundled in the APK's `assets/www` folder
3. The Android app loads these files in a WebView from `file:///android_asset/www/`
4. IndexedDB works natively in WebView for local data storage
5. Only external API calls (Gemini) go over the internet

## Project Structure

```
android-app/
├── app/
│   └── src/main/
│       ├── assets/www/       # Bundled web app files
│       ├── java/com/simusoul/app/
│       │   └── MainActivity.kt  # WebView wrapper
│       ├── res/              # Android resources
│       └── AndroidManifest.xml
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew
```

## Architecture

```
┌─────────────────────────────────────┐
│           Android APK               │
├─────────────────────────────────────┤
│   MainActivity (WebView wrapper)    │
├─────────────────────────────────────┤
│   assets/www/ (static web files)    │
│   ├── index.html                    │
│   ├── _next/ (JS, CSS bundles)      │
│   ├── personas/                     │
│   └── ...                           │
└─────────────────────────────────────┘
         │
         │ API calls only
         ▼
┌─────────────────────────────────────┐
│      Gemini API (Internet)          │
└─────────────────────────────────────┘
```

## Configuration

Before using the app, you need to add a Gemini API key:
1. Launch the app
2. Go to Settings
3. Add your Gemini API key

Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## License

© Musheer Alam. All Rights Reserved.
