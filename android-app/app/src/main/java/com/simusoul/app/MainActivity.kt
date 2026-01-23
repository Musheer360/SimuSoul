package com.simusoul.app

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import java.io.IOException

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        
        // Create WebView
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            
            // Configure WebView settings
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                loadWithOverviewMode = true
                useWideViewPort = true
                
                // Allow local storage (IndexedDB)
                javaScriptCanOpenWindowsAutomatically = true
            }
            
            // Set dark background color
            setBackgroundColor(Color.parseColor("#0a0a0a"))
            
            // Custom WebViewClient to handle navigation
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    
                    // Allow all file:// and asset URLs to load in WebView
                    if (url.startsWith("file://") || url.startsWith("https://appassets.androidplatform.net")) {
                        return false
                    }
                    
                    // For external URLs (API calls), allow them
                    return false
                }
                
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // Inject CSS to fix any mobile viewport issues
                    view?.evaluateJavascript("""
                        (function() {
                            var meta = document.querySelector('meta[name="viewport"]');
                            if (!meta) {
                                meta = document.createElement('meta');
                                meta.name = 'viewport';
                                document.head.appendChild(meta);
                            }
                            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
                            
                            // Add padding for safe areas on notched devices
                            document.body.style.paddingTop = 'env(safe-area-inset-top)';
                            document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
                        })();
                    """.trimIndent(), null)
                }
            }
            
            // Custom WebChromeClient for console logging and permissions
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        android.util.Log.d("SimuSoul-Web", "${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
                    }
                    return true
                }
                
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request?.grant(request.resources)
                }
            }
        }
        
        setContentView(webView)
        
        // Handle back button navigation in WebView
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
        
        // Check if web files exist and load appropriate page
        if (webFilesExist()) {
            webView.loadUrl("file:///android_asset/www/index.html")
        } else {
            webView.loadUrl("file:///android_asset/www/fallback.html")
        }
    }
    
    private fun webFilesExist(): Boolean {
        return try {
            val files = assets.list("www") ?: emptyArray()
            // Check if index.html exists (not just fallback.html)
            files.contains("index.html")
        } catch (e: IOException) {
            false
        }
    }
    
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
    
    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }
}
