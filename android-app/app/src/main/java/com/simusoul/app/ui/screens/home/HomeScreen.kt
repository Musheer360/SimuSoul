package com.simusoul.app.ui.screens.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Rocket
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.models.UserDetails
import com.simusoul.app.ui.components.AnimatedGradientText
import com.simusoul.app.ui.components.SiteHeader
import com.simusoul.app.ui.components.TermsDialog
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    repository: SimuSoulRepository,
    onNavigateToPersonas: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToAbout: () -> Unit,
    isDarkTheme: Boolean,
    onThemeToggle: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    val scope = rememberCoroutineScope()
    
    var userDetails by remember { mutableStateOf<UserDetails?>(null) }
    var showTermsDialog by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        val details = repository.getUserDetails()
        userDetails = details
        if (!details.hasAcceptedTerms) {
            showTermsDialog = true
        }
    }
    
    if (showTermsDialog) {
        TermsDialog(
            onAccept = {
                scope.launch {
                    userDetails?.let { details ->
                        repository.saveUserDetails(details.copy(hasAcceptedTerms = true))
                        userDetails = details.copy(hasAcceptedTerms = true)
                    }
                    showTermsDialog = false
                }
            }
        )
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
    ) {
        SiteHeader(
            onNavigateToSettings = onNavigateToSettings,
            onNavigateToAbout = onNavigateToAbout,
            isDarkTheme = isDarkTheme,
            onThemeToggle = onThemeToggle
        )
        
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 16.dp)
            ) {
                AnimatedGradientText(
                    text = "Create, Converse, Connect.",
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Craft unique AI personas and engage in dynamic, memorable conversations. Your imagination is the only limit.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = colors.mutedForeground,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
                
                Spacer(modifier = Modifier.height(32.dp))
                
                Button(
                    onClick = onNavigateToPersonas,
                    modifier = Modifier
                        .height(56.dp)
                        .padding(horizontal = 32.dp),
                    shape = RoundedCornerShape(28.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.primary,
                        contentColor = colors.primaryForeground
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Rocket,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Get Started",
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
        }
    }
}
