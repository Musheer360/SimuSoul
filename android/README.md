# SimuSoul Android App

This is a native Android wrapper for the SimuSoul web application. It wraps the deployed web app in a fullscreen WebView to provide a native app experience.

## How It Works

The Android app uses a WebView to load the SimuSoul web application from `https://simusoul.vercel.app`. This approach provides:

- **Native app experience**: Runs as a fullscreen app with no browser UI
- **Single codebase**: No need to maintain separate native code for features
- **Automatic updates**: Web updates are reflected immediately in the app
- **Easy deployment**: Build once, deploy via Vercel for web and Play Store for Android

## Building the APK

### Prerequisites

1. [Android Studio](https://developer.android.com/studio) (Arctic Fox or newer)
2. Android SDK (API 34 recommended)
3. JDK 17 or newer

### Build Steps

1. Open Android Studio
2. Open the `android/` folder as a project
3. Wait for Gradle sync to complete
4. Build → Build Bundle(s) / APK(s) → Build APK(s)

Or from command line:

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Signing for Release

For Play Store release, you'll need to sign the APK:

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore simusoul-release.keystore -alias simusoul -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add signing config to `app/build.gradle.kts`

3. Build signed APK or AAB (App Bundle)

## Customization

### Changing the Web App URL

Update the `WEB_APP_URL` constant in `MainActivity.kt`:

```kotlin
private const val WEB_APP_URL = "https://your-url.vercel.app"
```

### App Icon

Replace the launcher icons in `app/src/main/res/drawable/`:
- `ic_launcher_foreground.xml` - Foreground icon layer
- `ic_launcher_background.xml` - Background color/pattern

For different density icons, add PNG files to `mipmap-*` folders.

### Theme Colors

Edit `app/src/main/res/values/colors.xml` to match your brand.

## Notes

- The Android code in this folder is ignored by Vercel during deployment
- Vercel only looks at the root Next.js configuration files
- This setup allows both web and Android apps to coexist in the same repository
