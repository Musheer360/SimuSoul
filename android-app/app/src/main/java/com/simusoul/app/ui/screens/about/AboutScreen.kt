package com.simusoul.app.ui.screens.about

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.simusoul.app.ui.theme.SimuSoulTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(
    onNavigateBack: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("About") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colors.background,
                    titleContentColor = colors.foreground
                )
            )
        },
        containerColor = colors.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = colors.card
                )
            ) {
                Column(
                    modifier = Modifier.padding(24.dp)
                ) {
                    Text(
                        text = "About SimuSoul",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.foreground,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Welcome Section
                    Text(
                        text = "Welcome",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.foreground
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "SimuSoul is an application designed to let you create, customize, and interact with unique AI-powered personas. Whether for creative writing, role-playing, or simply exploring the potential of conversational AI, SimuSoul provides a sandboxed environment for your imagination. All your data, including persona details and chat histories, is stored locally and securely on your device, ensuring your creations remain private.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    HorizontalDivider(color = colors.border)
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Privacy Policy Section
                    Text(
                        text = "Privacy Policy",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.foreground
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "Your privacy is paramount. SimuSoul operates almost entirely on your local device.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    BulletPoint(
                        title = "Local Data Storage:",
                        text = "All persona data, chat messages, and user settings are stored exclusively on your device. This data is not uploaded to any server."
                    )
                    
                    BulletPoint(
                        title = "AI Interaction Data:",
                        text = "To enable chat functionality, your conversation prompts are sent to the Google Gemini API. This data is subject to Google's privacy policies."
                    )
                    
                    BulletPoint(
                        title = "Sensitive Information:",
                        text = "We strongly advise against entering any real, personal, or sensitive information into your conversations."
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    HorizontalDivider(color = colors.border)
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Guidelines Section
                    Text(
                        text = "Guidelines & Disclaimer",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.foreground
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "By using SimuSoul, you agree to the following terms:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    BulletPoint(
                        title = "User Responsibility:",
                        text = "You are solely responsible for the content you create and the interactions you have with the AI personas. AI-generated content is for entertainment purposes only."
                    )
                    
                    BulletPoint(
                        title = "Content Guardrails:",
                        text = "The application has built-in restrictions to prevent the generation of content related to controversial topics."
                    )
                    
                    BulletPoint(
                        title = "No Liability:",
                        text = "Musheer Alam and any associated parties are not liable for any content generated by the AI, data loss, or other issues. Use at your own risk."
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    HorizontalDivider(color = colors.border)
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        text = "© $currentYear Musheer Alam. All Rights Reserved.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.mutedForeground,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = onNavigateBack,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.primary,
                            contentColor = colors.primaryForeground
                        )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Back to Home")
                    }
                }
            }
        }
    }
}

@Composable
private fun BulletPoint(
    title: String,
    text: String
) {
    val colors = SimuSoulTheme.colors
    
    Row(
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Text(
            text = "•  ",
            style = MaterialTheme.typography.bodyMedium,
            color = colors.mutedForeground
        )
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = colors.foreground
            )
            Text(
                text = text,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.mutedForeground
            )
        }
    }
}
