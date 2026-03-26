# SimuSoul Android App

This is the native Android version of the SimuSoul web application, built with Kotlin and Jetpack Compose.

## Features

The Android app includes all features from the web version:

- **Home Screen**: Welcome screen with animated gradient title and Get Started button
- **Personas Management**: Create, view, and delete AI personas
- **Persona Creation**: 
  - Manual creation with detailed forms
  - AI-assisted generation from natural language prompts
- **Chat Interface**: Engage in conversations with your personas
- **Settings**: 
  - Manage user profile
  - Configure Gemini API keys
  - Reset application data
- **About**: App information and privacy policy
- **Dark/Light Theme**: Automatic theme switching with AMOLED black for dark mode

## Tech Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose with Material3
- **Architecture**: MVVM with Repository pattern
- **Database**: Room for local data persistence
- **Networking**: Retrofit + OkHttp for API calls
- **Image Loading**: Coil for async image loading
- **State Management**: StateFlow and Compose State
- **AI**: Google Gemini API integration

## Project Structure

```
app/src/main/java/com/simusoul/app/
├── data/
│   ├── local/          # Room database, DAOs, DataStore
│   ├── model/          # Data models and type converters
│   ├── remote/         # Retrofit API services
│   └── repository/     # Repository implementations
├── ui/
│   ├── screens/        # Composable screens
│   ├── components/     # Reusable UI components
│   ├── navigation/     # Navigation setup
│   └── theme/          # Theme, colors, typography
├── MainActivity.kt     # Main activity
└── SimuSoulApplication.kt  # Application class
```

## Building the App

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17 or later
- Android SDK 34
- Minimum SDK: 24 (Android 7.0)

### Build Instructions

1. Clone the repository:
```bash
git clone https://github.com/Musheer360/SimuSoul.git
cd SimuSoul/android
```

2. Open the project in Android Studio

3. Sync Gradle files (File → Sync Project with Gradle Files)

4. Build the app:
```bash
./gradlew assembleDebug
```

5. The APK will be generated at:
```
app/build/outputs/apk/debug/app-debug.apk
```

### Run on Device/Emulator

```bash
./gradlew installDebug
```

Or use Android Studio's Run button (Shift+F10)

## Configuration

### API Keys

The app requires a Google Gemini API key to function. You can obtain a free API key from:
https://aistudio.google.com/app/apikey

Add your API key in the app's Settings screen. The app supports up to 5 API keys for load balancing.

### Data Storage

All data is stored locally on the device:
- **Personas and Chats**: Room database
- **Settings and API Keys**: DataStore (encrypted)
- **Location**: `/data/data/com.simusoul.app/`

## Key Features Implementation

### Theme System

The app uses Material3 theming with custom colors matching the web app:
- **Dark Theme**: Pure black (AMOLED-friendly) with white primary
- **Light Theme**: White background with dark primary
- **Accent Color**: Cyan blue (#48BFE3)

### Database Schema

**Personas Table**:
- id, name, relation, age, backstory, traits, goals, responseStyle
- profilePictureUrl, minWpm, maxWpm, memories
- lastChatTime, createdAt

**ChatSessions Table**:
- id, personaId, title, messages (JSON)
- createdAt, updatedAt, summary, lastSummarizedAtMessageCount

### AI Integration

The app uses the Gemini API for:
1. **Chat Responses**: Context-aware conversations with personas
2. **Persona Generation**: Creating personas from natural language descriptions
3. **Chat Summarization**: (Future feature)

### Navigation Flow

```
Home → Personas List → Persona Detail (Chat)
         ↓
    Create Persona
         
Settings ← → About
```

## Dependencies

```gradle
// Core
androidx.core:core-ktx:1.12.0
androidx.lifecycle:lifecycle-runtime-ktx:2.7.0

// Compose
androidx.compose:compose-bom:2023.10.01
androidx.compose.material3:material3
androidx.compose.material:material-icons-extended

// Navigation
androidx.navigation:navigation-compose:2.7.6

// Room
androidx.room:room-runtime:2.6.1
androidx.room:room-ktx:2.6.1

// Networking
com.squareup.retrofit2:retrofit:2.9.0
com.squareup.okhttp3:okhttp:4.12.0

// Image Loading
io.coil-kt:coil-compose:2.5.0

// DataStore
androidx.datastore:datastore-preferences:1.0.0
```

## Screenshots

*(Screenshots would be added here after the app is built)*

## Privacy

- All data is stored locally on your device
- Conversation data is sent to Google Gemini API for processing
- No data is stored on external servers
- API keys are stored securely on device

## License

Copyright © 2026 Musheer Alam. All Rights Reserved.

## Contributing

This project was created as a conversion of the SimuSoul web app to Android. 

## Support

For issues or questions, please visit the main repository:
https://github.com/Musheer360/SimuSoul
