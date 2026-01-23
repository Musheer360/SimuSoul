# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /sdk/tools/proguard/proguard-android.txt

# Keep Gson classes
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep data classes
-keep class com.simusoul.app.data.models.** { *; }
-keep class com.simusoul.app.data.remote.** { *; }

# Keep Room entities
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keepclassmembers @androidx.room.Entity class * {
    <fields>;
}
