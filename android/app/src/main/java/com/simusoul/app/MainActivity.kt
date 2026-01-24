package com.simusoul.app

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.graphics.Bitmap
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * MainActivity wraps the SimuSoul web application in a WebView with Jetpack Compose.
 * Features theme-aware system bars, splash screen, and integrated loading animation.
 */
class MainActivity : ComponentActivity() {

    companion object {
        private const val WEB_APP_URL = "https://simusoul.vercel.app"
    }

    private var keepSplashScreen = true
    private var webViewInstance: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen before super.onCreate()
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { keepSplashScreen }

        super.onCreate(savedInstanceState)

        // Ensure content stays within system bars (not edge-to-edge)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        
        // Apply system bar colors based on current theme
        updateSystemBarColors()

        setContent {
            SimuSoulTheme {
                SimuSoulApp(
                    onWebViewCreated = { webView ->
                        webViewInstance = webView
                        setupBackNavigation(webView)
                    },
                    onSplashDismiss = { keepSplashScreen = false }
                )
            }
        }
    }
    
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // Update system bar colors when theme changes
        updateSystemBarColors()
    }
    
    private fun updateSystemBarColors() {
        val isDarkTheme = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        
        // Use color resources for consistency with theme
        val systemBarColor = if (isDarkTheme) {
            getColor(R.color.background_dark)
        } else {
            getColor(R.color.background_light)
        }
        
        window.statusBarColor = systemBarColor
        window.navigationBarColor = systemBarColor
        
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = !isDarkTheme
        insetsController.isAppearanceLightNavigationBars = !isDarkTheme
    }

    private fun setupBackNavigation(webView: WebView) {
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
    }

    override fun onResume() {
        super.onResume()
        webViewInstance?.onResume()
        // Also update system bar colors on resume in case theme changed while app was in background
        updateSystemBarColors()
    }

    override fun onPause() {
        super.onPause()
        webViewInstance?.onPause()
    }

    override fun onDestroy() {
        webViewInstance?.destroy()
        super.onDestroy()
    }
}

// Dark theme colors (pitch black)
private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF6366F1),
    onPrimary = Color.White,
    background = Color.Black,
    onBackground = Color.White,
    surface = Color.Black,
    onSurface = Color.White
)

// Light theme colors (pure white)
private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF6366F1),
    onPrimary = Color.White,
    background = Color.White,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black
)

@Composable
fun SimuSoulTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

@Composable
fun SimuSoulApp(
    onWebViewCreated: (WebView) -> Unit,
    onSplashDismiss: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var loadProgress by remember { mutableFloatStateOf(0f) }
    var splashDismissed by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // WebView (always present but may be hidden by loading overlay)
        SimuSoulWebView(
            url = "https://simusoul.vercel.app",
            onWebViewCreated = onWebViewCreated,
            onLoadingStateChanged = { loading -> isLoading = loading },
            onProgressChanged = { progress ->
                loadProgress = progress
                // Dismiss splash once we start loading
                if (progress > 0.1f && !splashDismissed) {
                    splashDismissed = true
                    onSplashDismiss()
                }
            }
        )

        // Loading overlay with animated logo
        AnimatedVisibility(
            visible = isLoading,
            enter = fadeIn(),
            exit = fadeOut(animationSpec = tween(500))
        ) {
            LoadingScreen(progress = loadProgress)
        }
    }
}

@Composable
fun LoadingScreen(progress: Float) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Animated "S" logo
            Text(
                text = "S",
                fontSize = 72.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.alpha(pulseAlpha)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Loading dots animation
            LoadingDots()
        }
    }
}

@Composable
fun LoadingDots() {
    val infiniteTransition = rememberInfiniteTransition(label = "dots")
    
    val dot1Alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot1"
    )
    
    val dot2Alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, delayMillis = 200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot2"
    )
    
    val dot3Alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, delayMillis = 400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot3"
    )

    Row {
        listOf(dot1Alpha, dot2Alpha, dot3Alpha).forEach { alpha ->
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .alpha(alpha)
                    .background(
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape
                    )
            )
            Spacer(modifier = Modifier.size(8.dp))
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun SimuSoulWebView(
    url: String,
    onWebViewCreated: (WebView) -> Unit,
    onLoadingStateChanged: (Boolean) -> Unit,
    onProgressChanged: (Float) -> Unit
) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                    setSupportZoom(false)
                    builtInZoomControls = false
                    displayZoomControls = false
                    allowFileAccess = false
                    allowContentAccess = false
                }

                webViewClient = object : WebViewClient() {
                    override fun onPageStarted(view: WebView?, pageUrl: String?, favicon: Bitmap?) {
                        super.onPageStarted(view, pageUrl, favicon)
                        onLoadingStateChanged(true)
                    }

                    override fun onPageFinished(view: WebView?, pageUrl: String?) {
                        super.onPageFinished(view, pageUrl)
                        onLoadingStateChanged(false)
                    }

                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        request: WebResourceRequest?
                    ): Boolean {
                        val requestUrl = request?.url?.toString() ?: return false
                        return if (requestUrl.startsWith(url)) {
                            false
                        } else {
                            try {
                                context.startActivity(
                                    android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        android.net.Uri.parse(requestUrl)
                                    )
                                )
                            } catch (_: android.content.ActivityNotFoundException) {
                                // No browser available
                            }
                            true
                        }
                    }
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onProgressChanged(view: WebView?, newProgress: Int) {
                        onProgressChanged(newProgress / 100f)
                    }
                }

                onWebViewCreated(this)
                loadUrl(url)
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
