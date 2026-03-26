# Building SimuSoul Android App - Complete Guide

## System Requirements

- **Operating System**: Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: 8 GB minimum (16 GB recommended)
- **Disk Space**: 10 GB free space minimum
- **Java**: JDK 17 or later
- **Internet**: Required for downloading dependencies

## Step 1: Install Android Studio

1. Download Android Studio from: https://developer.android.com/studio
2. Install Android Studio following the setup wizard
3. During installation, ensure you install:
   - Android SDK
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android Emulator (optional, for testing)

## Step 2: Configure Android SDK

1. Open Android Studio
2. Go to **Settings/Preferences** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. In the **SDK Platforms** tab, ensure you have installed:
   - Android 14.0 (API Level 34)
   - Android 7.0 (API Level 24) - minimum supported version
4. In the **SDK Tools** tab, ensure you have:
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools
   - Android Emulator (if you want to test without a physical device)

## Step 3: Clone the Repository

```bash
git clone https://github.com/Musheer360/SimuSoul.git
cd SimuSoul/android
```

## Step 4: Open Project in Android Studio

1. Launch Android Studio
2. Click **File** → **Open**
3. Navigate to the `SimuSoul/android` directory
4. Click **OK**
5. Wait for Android Studio to sync the project (this may take a few minutes on first run)

## Step 5: Sync Dependencies

Android Studio should automatically start syncing Gradle and downloading dependencies. If not:

1. Click **File** → **Sync Project with Gradle Files**
2. Wait for the sync to complete (may take 5-10 minutes on first run)
3. If there are any errors, check the **Build** output window at the bottom

## Step 6: Build the APK

### Option A: Using Android Studio

1. In Android Studio, go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for the build to complete (progress shown in bottom-right corner)
3. When finished, a notification will appear with a link to the APK location
4. Click "locate" to find the APK at: `app/build/outputs/apk/debug/app-debug.apk`

### Option B: Using Command Line

Open a terminal in the `android` directory and run:

**On Linux/macOS**:
```bash
./gradlew assembleDebug
```

**On Windows**:
```cmd
gradlew.bat assembleDebug
```

The APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk`

## Step 7: Install on Device

### Option A: Physical Android Device

1. Enable Developer Options on your Android device:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings** → **Developer Options**
   - Enable **USB Debugging**

2. Connect your device via USB

3. Install the APK:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or use Android Studio:
- Click the **Run** button (green triangle) or press **Shift+F10**
- Select your device from the list
- Click **OK**

### Option B: Android Emulator

1. In Android Studio, click **Device Manager** (phone icon in top-right)
2. Click **Create Virtual Device**
3. Select a device definition (e.g., Pixel 5)
4. Select a system image (Android 14.0 recommended)
5. Click **Finish**
6. Click the **Run** button and select your emulator
7. Wait for the emulator to start and the app to install

### Option C: Direct APK Installation

1. Copy the APK file to your Android device
2. On your device, go to **Settings** → **Security**
3. Enable **Install from Unknown Sources**
4. Use a file manager to navigate to the APK
5. Tap the APK file and follow the installation prompts

## Troubleshooting

### Common Issues

**1. "SDK location not found"**
- Solution: Set ANDROID_HOME environment variable to your SDK location
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk  # Linux/macOS
  set ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk  # Windows
  ```

**2. "Gradle sync failed"**
- Solution: 
  - Check your internet connection
  - Click **File** → **Invalidate Caches** → **Invalidate and Restart**
  - Delete `.gradle` folder and sync again

**3. "Compilation error"**
- Solution:
  - Ensure you have JDK 17 installed
  - Check that Android SDK 34 is installed
  - Clean and rebuild: **Build** → **Clean Project**, then **Build** → **Rebuild Project**

**4. "Unable to resolve dependencies"**
- Solution:
  - Check your internet connection
  - Try using a VPN if some Maven repositories are blocked
  - Check `build.gradle` files for correct repository URLs

**5. "Installation failed"**
- Solution:
  - Uninstall any existing version of the app
  - Ensure USB debugging is enabled
  - Try: `adb kill-server && adb start-server`

### Build Variants

The project includes two build variants:
- **debug**: For development and testing (includes debugging symbols)
- **release**: For production (optimized and signed)

To build release APK:
```bash
./gradlew assembleRelease
```

*Note: Release APK requires signing with a keystore. For production releases, configure signing in `app/build.gradle.kts`*

## Verify Installation

1. Launch the app on your device
2. Accept the terms and conditions
3. Navigate to Settings and add your Gemini API key
4. Create a test persona
5. Try chatting with the persona

## Next Steps

After successful installation:
1. Get a Gemini API key from: https://aistudio.google.com/app/apikey
2. Add the API key in the app's Settings
3. Create your first persona
4. Start chatting!

## Additional Resources

- [Android Developer Documentation](https://developer.android.com/docs)
- [Jetpack Compose Documentation](https://developer.android.com/jetpack/compose)
- [Kotlin Documentation](https://kotlinlang.org/docs/home.html)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Search for the error in Android Studio's Build output
3. Check the project's GitHub issues: https://github.com/Musheer360/SimuSoul/issues
4. Open a new issue with:
   - Error message
   - Android Studio version
   - Android SDK version
   - Build output logs
