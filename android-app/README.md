# SimuSoul Android App

Native Android implementation of SimuSoul using Kotlin and Jetpack Compose.

## Features

- Create and customize AI personas
- Chat with personas using Gemini AI
- Local data storage with Room database
- Dark/Light theme support (AMOLED dark)
- Material Design 3 UI

## Requirements

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 35
- Minimum SDK: 26 (Android 8.0)

## Building the APK

### Using GitHub Actions (Recommended)

A GitHub Actions workflow is included that automatically builds the APK:

1. Go to **Actions** tab in the repository
2. Click on **Build Android APK** workflow
3. Click **Run workflow** button
4. After the build completes, download the APK from the workflow artifacts

### Using Android Studio

1. Open the `android-app` folder in Android Studio
2. Wait for Gradle sync to complete
3. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. The APK will be generated in `app/build/outputs/apk/debug/`

### Using Command Line

```bash
cd android-app
./gradlew assembleDebug
```

The APK will be at `app/build/outputs/apk/debug/app-debug.apk`

## Project Structure

```
android-app/
├── app/
│   └── src/main/
│       ├── java/com/simusoul/app/
│       │   ├── data/           # Data layer (Room DB, API, Repository)
│       │   ├── navigation/     # Navigation setup
│       │   ├── ui/             # UI components and screens
│       │   │   ├── components/ # Reusable UI components
│       │   │   ├── screens/    # App screens
│       │   │   └── theme/      # Theme and styling
│       │   ├── MainActivity.kt
│       │   └── SimuSoulApplication.kt
│       ├── res/                # Android resources
│       └── AndroidManifest.xml
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew
```

## Configuration

Before using the app, you need to add a Gemini API key:
1. Launch the app
2. Go to Settings
3. Add your Gemini API key

Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## License

© Musheer Alam. All Rights Reserved.
