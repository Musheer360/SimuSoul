package com.simusoul.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.simusoul.app.navigation.SimuSoulNavHost
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val application = application as SimuSoulApplication
        val repository = application.repository
        
        setContent {
            val navController = rememberNavController()
            val scope = rememberCoroutineScope()
            
            // Theme state
            var isDarkTheme by remember { mutableStateOf(true) }
            
            // Load theme preference
            LaunchedEffect(Unit) {
                repository.themeMode.collect { mode ->
                    isDarkTheme = mode == "dark"
                }
            }
            
            SimuSoulTheme(darkTheme = isDarkTheme) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SimuSoulNavHost(
                        navController = navController,
                        repository = repository,
                        isDarkTheme = isDarkTheme,
                        onThemeToggle = {
                            isDarkTheme = !isDarkTheme
                            scope.launch {
                                repository.setThemeMode(if (isDarkTheme) "dark" else "light")
                            }
                        }
                    )
                }
            }
        }
    }
}
