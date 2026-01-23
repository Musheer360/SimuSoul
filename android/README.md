# SimuSoul Android App

A modern, native Android wrapper for the SimuSoul web application built with **Jetpack Compose** and the latest Android technologies.

## Features

- **Jetpack Compose UI** - Modern declarative UI framework
- **Material 3** - Latest Material Design components
- **Splash Screen API** - Native splash screen with animated "S" logo
- **Theme-aware system bars** - Status bar and nav bar colors adapt to light/dark mode
- **Smooth loading transition** - Animated loading screen integrated with splash
- **Edge-to-edge display** - Content extends behind system bars with proper insets

## Tech Stack

- **Kotlin 2.1** - Latest stable Kotlin version
- **Jetpack Compose BOM 2024.12** - Latest Compose libraries
- **Android Gradle Plugin 8.7** - Latest build tooling
- **Target SDK 35** - Android 15 support
- **Min SDK 24** - Android 7.0+ (covers 99%+ of devices)

## How It Works

The app uses a WebView to load the SimuSoul web application from `https://simusoul.vercel.app`:

1. **Splash Screen**: Shows animated "S" logo on app launch
2. **Loading Screen**: Displays pulsing logo with animated dots while web content loads
3. **WebView**: Renders the full web app with native-like experience
4. **Theme Sync**: System bars adapt to light/dark mode (white/black backgrounds)

## Building the APK

### Prerequisites

1. [Android Studio](https://developer.android.com/studio) (Ladybug or newer recommended)
2. Android SDK (API 35)
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

Update the URL in `MainActivity.kt`:

```kotlin
private const val WEB_APP_URL = "https://your-url.vercel.app"
```

### App Icon & Splash Logo

- `app/src/main/res/drawable/splash_icon.xml` - Splash screen logo
- `app/src/main/res/drawable/ic_launcher_foreground.xml` - Launcher icon foreground
- `app/src/main/res/drawable/ic_launcher_background.xml` - Launcher icon background

### Theme Colors

Edit `app/src/main/res/values/colors.xml` to customize brand colors.

## Notes

- The Android code in this folder is ignored by Vercel during deployment
- Vercel only looks at the root Next.js configuration files
- This setup allows both web and Android apps to coexist in the same repository
