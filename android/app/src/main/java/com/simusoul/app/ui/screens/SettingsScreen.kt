package com.simusoul.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.simusoul.app.SimuSoulApplication
import com.simusoul.app.data.model.ApiKeys
import com.simusoul.app.data.model.UserDetails
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as SimuSoulApplication
    val viewModel: SettingsViewModel = viewModel(
        factory = SettingsViewModelFactory(app.repository)
    )
    
    val userDetails by viewModel.userDetails.collectAsState()
    val apiKeys by viewModel.apiKeys.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val scope = rememberCoroutineScope()
    
    var showClearDialog by remember { mutableStateOf(false) }
    var name by remember(userDetails) { mutableStateOf(userDetails.name) }
    var about by remember(userDetails) { mutableStateOf(userDetails.about) }
    var geminiKeys by remember(apiKeys) { mutableStateOf(apiKeys.gemini) }
    
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f)
            )
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    text = "Settings",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = "Customize your experience. Your details are saved locally on your device.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(
                    text = "Your Details",
                    style = MaterialTheme.typography.titleLarge
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = about,
                    onValueChange = { about = it },
                    label = { Text("About You") },
                    placeholder = { Text("A short description of you") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4,
                    maxLines = 6
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(
                    text = "API Keys",
                    style = MaterialTheme.typography.titleLarge
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                geminiKeys.forEachIndexed { index, key ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = key,
                            onValueChange = { newValue ->
                                geminiKeys = geminiKeys.toMutableList().apply {
                                    set(index, newValue)
                                }
                            },
                            label = { Text("Gemini API Key ${index + 1}") },
                            modifier = Modifier.weight(1f),
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                        )
                        if (geminiKeys.size > 1) {
                            IconButton(
                                onClick = {
                                    geminiKeys = geminiKeys.filterIndexed { i, _ -> i != index }
                                }
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Remove")
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                if (geminiKeys.size < 5) {
                    OutlinedButton(
                        onClick = { geminiKeys = geminiKeys + "" },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Add another API key")
                    }
                }
                
                Text(
                    text = "Get your free API key from Google AI Studio. Keys are stored locally on your device.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp)
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(24.dp))
                
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Danger Zone",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Reset Application",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "This will permanently delete all your personas, chats, settings, and API keys. This action is irreversible.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = { showClearDialog = true },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Clear All Data")
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Back")
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                viewModel.saveSettings(
                                    UserDetails(name, about, userDetails.hasAcceptedTerms),
                                    ApiKeys(geminiKeys.filter { it.isNotBlank() })
                                )
                                onNavigateBack()
                            }
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Save Changes")
                    }
                }
            }
        }
    }
    
    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = { Text("Are you absolutely sure?") },
            text = { 
                Text("This will permanently delete everything, including all personas, chats, memories, and your user settings. This action cannot be undone.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            viewModel.clearAllData()
                            showClearDialog = false
                            // Restart activity
                            (context as? androidx.activity.ComponentActivity)?.recreate()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Yes, delete everything")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

// ViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.simusoul.app.data.repository.SimuSoulRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(private val repository: SimuSoulRepository) : ViewModel() {
    private val _userDetails = MutableStateFlow(UserDetails())
    val userDetails: StateFlow<UserDetails> = _userDetails.asStateFlow()
    
    private val _apiKeys = MutableStateFlow(ApiKeys(listOf("")))
    val apiKeys: StateFlow<ApiKeys> = _apiKeys.asStateFlow()
    
    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    init {
        loadSettings()
    }
    
    private fun loadSettings() {
        viewModelScope.launch {
            repository.getUserDetails().collect { _userDetails.value = it }
        }
        viewModelScope.launch {
            repository.getApiKeys().collect { 
                _apiKeys.value = if (it.gemini.isEmpty()) ApiKeys(listOf("")) else it
            }
        }
        _isLoading.value = false
    }
    
    suspend fun saveSettings(userDetails: UserDetails, apiKeys: ApiKeys) {
        repository.saveUserDetails(userDetails)
        repository.saveApiKeys(apiKeys)
    }
    
    suspend fun clearAllData() {
        repository.clearAllData()
    }
}

class SettingsViewModelFactory(private val repository: SimuSoulRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return SettingsViewModel(repository) as T
    }
}
