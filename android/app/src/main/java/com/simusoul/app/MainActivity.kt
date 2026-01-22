package com.simusoul.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.simusoul.app.ui.navigation.Screen
import com.simusoul.app.ui.navigation.SimuSoulNavigation
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val app = application as SimuSoulApplication
        
        setContent {
            var isDarkTheme by remember { mutableStateOf(true) }
            
            SimuSoulTheme(darkTheme = isDarkTheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
                    
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Top App Bar
                        if (currentRoute != null) {
                            SimuSoulTopBar(
                                currentRoute = currentRoute,
                                onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                                onNavigateToAbout = { navController.navigate(Screen.About.route) },
                                onNavigateToHome = { navController.navigate(Screen.Home.route) },
                                onThemeToggle = { isDarkTheme = !isDarkTheme }
                            )
                        }
                        
                        // Check terms acceptance
                        var hasAcceptedTerms by remember { mutableStateOf(true) }
                        var showTermsDialog by remember { mutableStateOf(false) }
                        
                        LaunchedEffect(Unit) {
                            val userDetails = app.repository.getUserDetails().first()
                            hasAcceptedTerms = userDetails.hasAcceptedTerms
                            showTermsDialog = !hasAcceptedTerms
                        }
                        
                        if (showTermsDialog) {
                            TermsDialog(
                                onAccept = {
                                    kotlinx.coroutines.GlobalScope.launch {
                                        val userDetails = app.repository.getUserDetails().first()
                                        app.repository.saveUserDetails(
                                            userDetails.copy(hasAcceptedTerms = true)
                                        )
                                    }
                                    showTermsDialog = false
                                    hasAcceptedTerms = true
                                }
                            )
                        }
                        
                        // Main content
                        SimuSoulNavigation(
                            navController = navController,
                            startDestination = Screen.Home.route
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SimuSoulTopBar(
    currentRoute: String,
    onNavigateToSettings: () -> Unit,
    onNavigateToAbout: () -> Unit,
    onNavigateToHome: () -> Unit,
    onThemeToggle: () -> Unit
) {
    TopAppBar(
        title = {
            Text(
                text = "SimuSoul",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.primary
            )
        },
        navigationIcon = {
            if (currentRoute != Screen.Home.route) {
                TextButton(onClick = onNavigateToHome) {
                    Text("SimuSoul")
                }
            }
        },
        actions = {
            IconButton(onClick = onNavigateToAbout) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "About"
                )
            }
            IconButton(onClick = onThemeToggle) {
                Icon(
                    imageVector = if (isSystemInDarkTheme()) 
                        Icons.Default.Settings // Placeholder
                    else 
                        Icons.Default.Settings, // Placeholder
                    contentDescription = "Toggle theme"
                )
            }
            IconButton(onClick = onNavigateToSettings) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Settings"
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            titleContentColor = MaterialTheme.colorScheme.onBackground
        )
    )
}

@Composable
fun TermsDialog(onAccept: () -> Unit) {
    AlertDialog(
        onDismissRequest = { },
        title = { Text("Terms and Conditions") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    """
Welcome to SimuSoul!

By using this application, you agree to the following:

Privacy: All your data is stored locally on your device. Conversation data is sent to Google Gemini API for AI processing.

Responsibility: You are responsible for the content you create. AI-generated content is for entertainment purposes only.

Guidelines: The app has content guardrails to prevent generation of inappropriate content.

No Liability: The developer is not liable for any content generated by the AI or any data loss.
                    """.trimIndent(),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        },
        confirmButton = {
            Button(onClick = onAccept) {
                Text("I Accept")
            }
        }
    )
}
