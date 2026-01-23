package com.simusoul.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.models.ApiKeys
import com.simusoul.app.data.models.UserDetails
import com.simusoul.app.ui.components.ConfirmDialog
import com.simusoul.app.ui.components.LoadingIndicator
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    repository: SimuSoulRepository,
    onNavigateBack: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    val scope = rememberCoroutineScope()
    
    var userDetails by remember { mutableStateOf<UserDetails?>(null) }
    var apiKeys by remember { mutableStateOf<List<String>>(listOf("")) }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var showClearDataDialog by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        val details = repository.getUserDetails()
        val keys = repository.getApiKeys()
        userDetails = details
        apiKeys = if (keys.gemini.isNotEmpty()) keys.gemini else listOf("")
        isLoading = false
    }
    
    if (isLoading) {
        LoadingIndicator()
        return
    }
    
    if (showClearDataDialog) {
        ConfirmDialog(
            title = "Clear All Data?",
            message = "This will permanently delete all personas, chats, and settings. This action cannot be undone.",
            confirmText = "Delete Everything",
            isDestructive = true,
            onConfirm = {
                scope.launch {
                    repository.clearAllData()
                    showClearDataDialog = false
                    onNavigateBack()
                }
            },
            onDismiss = { showClearDataDialog = false }
        )
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
            // Settings Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = colors.card
                )
            ) {
                Column(
                    modifier = Modifier.padding(20.dp)
                ) {
                    Text(
                        text = "Settings",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.foreground,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Text(
                        text = "Customize your experience. Your details are saved locally.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Your Details Section
                    Text(
                        text = "Your Details",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.foreground
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    OutlinedTextField(
                        value = userDetails?.name ?: "",
                        onValueChange = { userDetails = userDetails?.copy(name = it) },
                        label = { Text("Name") },
                        placeholder = { Text("Your name") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            unfocusedBorderColor = colors.border
                        )
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    OutlinedTextField(
                        value = userDetails?.about ?: "",
                        onValueChange = { userDetails = userDetails?.copy(about = it) },
                        label = { Text("About You") },
                        placeholder = { Text("A short description of you") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 4,
                        maxLines = 6,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            unfocusedBorderColor = colors.border
                        )
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // API Keys Section
                    Text(
                        text = "API Keys",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.foreground
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    apiKeys.forEachIndexed { index, key ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = key,
                                onValueChange = { newValue ->
                                    apiKeys = apiKeys.toMutableList().also { it[index] = newValue }
                                },
                                label = { Text("Gemini API Key ${index + 1}") },
                                placeholder = { Text("Enter Gemini key") },
                                modifier = Modifier.weight(1f),
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = colors.primary,
                                    unfocusedBorderColor = colors.border
                                )
                            )
                            
                            if (apiKeys.size > 1) {
                                IconButton(
                                    onClick = {
                                        apiKeys = apiKeys.toMutableList().also { it.removeAt(index) }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Remove key",
                                        tint = colors.mutedForeground
                                    )
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    if (apiKeys.size < 5) {
                        OutlinedButton(
                            onClick = {
                                apiKeys = apiKeys + ""
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = colors.mutedForeground
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Add another API key")
                        }
                    }
                    
                    Text(
                        text = "Get your free API key from Google AI Studio. Keys are stored locally on your device.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.mutedForeground,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    HorizontalDivider(color = colors.border)
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Danger Zone
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = colors.destructive.copy(alpha = 0.1f)
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Danger Zone",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.destructive
                            )
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            Text(
                                text = "Reset Application",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = colors.foreground
                            )
                            
                            Text(
                                text = "This will permanently delete all your personas, chats, settings, and API keys.",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.mutedForeground,
                                textAlign = TextAlign.Center
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Button(
                                onClick = { showClearDataDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.destructive,
                                    contentColor = colors.destructiveForeground
                                )
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Clear All Data")
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Action Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onNavigateBack,
                            modifier = Modifier.weight(1f),
                            enabled = !isSaving
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Back")
                        }
                        
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    userDetails?.let { repository.saveUserDetails(it) }
                                    repository.saveApiKeys(ApiKeys(gemini = apiKeys.filter { it.isNotBlank() }))
                                    isSaving = false
                                    onNavigateBack()
                                }
                            },
                            modifier = Modifier.weight(1f),
                            enabled = !isSaving,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.primary,
                                contentColor = colors.primaryForeground
                            )
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = colors.primaryForeground,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("Save Changes")
                            }
                        }
                    }
                }
            }
        }
    }
}
