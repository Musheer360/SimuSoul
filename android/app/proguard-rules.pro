# Add project specific ProGuard rules here.
# Keep WebView JavaScript interface methods
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the main activity
-keep class com.simusoul.app.MainActivity { *; }
