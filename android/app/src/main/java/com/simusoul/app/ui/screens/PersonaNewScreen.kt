package com.simusoul.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.simusoul.app.SimuSoulApplication
import com.simusoul.app.data.model.Persona
import com.simusoul.app.data.repository.SimuSoulRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonaNewScreen(
    onNavigateBack: () -> Unit,
    onPersonaCreated: (String) -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as SimuSoulApplication
    val viewModel: PersonaNewViewModel = viewModel(
        factory = PersonaNewViewModelFactory(app.repository)
    )
    
    var name by remember { mutableStateOf("") }
    var relation by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var traits by remember { mutableStateOf("") }
    var backstory by remember { mutableStateOf("") }
    var goals by remember { mutableStateOf("") }
    var responseStyle by remember { mutableStateOf("") }
    var prompt by remember { mutableStateOf("") }
    var selectedTab by remember { mutableStateOf(0) }
    
    val isCreating by viewModel.isCreating.collectAsState()
    val error by viewModel.error.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        IconButton(onClick = onNavigateBack) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
        }
        
        Text(
            text = "Create New Persona",
            style = MaterialTheme.typography.headlineMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TabRow(selectedTabIndex = selectedTab) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Manual") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("AI Generate") }
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        when (selectedTab) {
            0 -> {
                // Manual creation
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name *") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = relation,
                    onValueChange = { relation = it },
                    label = { Text("Relation *") },
                    placeholder = { Text("e.g., Friend, Mentor, etc.") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = age,
                    onValueChange = { age = it },
                    label = { Text("Age") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = traits,
                    onValueChange = { traits = it },
                    label = { Text("Personality Traits *") },
                    placeholder = { Text("Describe personality") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = backstory,
                    onValueChange = { backstory = it },
                    label = { Text("Backstory *") },
                    placeholder = { Text("Character history") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = goals,
                    onValueChange = { goals = it },
                    label = { Text("Goals & Motivations *") },
                    placeholder = { Text("What drives them?") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = responseStyle,
                    onValueChange = { responseStyle = it },
                    label = { Text("Response Style *") },
                    placeholder = { Text("How they communicate") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = {
                        viewModel.createPersonaManually(
                            name = name,
                            relation = relation,
                            age = age.toIntOrNull(),
                            traits = traits,
                            backstory = backstory,
                            goals = goals,
                            responseStyle = responseStyle,
                            onSuccess = onPersonaCreated
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isCreating && name.isNotBlank() && relation.isNotBlank() &&
                            traits.isNotBlank() && backstory.isNotBlank() &&
                            goals.isNotBlank() && responseStyle.isNotBlank()
                ) {
                    if (isCreating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Create Persona")
                    }
                }
            }
            1 -> {
                // AI generation
                OutlinedTextField(
                    value = prompt,
                    onValueChange = { prompt = it },
                    label = { Text("Describe your persona") },
                    placeholder = { Text("e.g., A wise old wizard who loves teaching magic") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 5
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = {
                        viewModel.generatePersonaFromPrompt(
                            prompt = prompt,
                            onSuccess = onPersonaCreated
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isCreating && prompt.isNotBlank()
                ) {
                    if (isCreating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Generate Persona")
                    }
                }
            }
        }
        
        if (error != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = error ?: "",
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }
    }
}

// ViewModel
class PersonaNewViewModel(private val repository: SimuSoulRepository) : ViewModel() {
    private val _isCreating = MutableStateFlow(false)
    val isCreating: StateFlow<Boolean> = _isCreating.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    fun createPersonaManually(
        name: String,
        relation: String,
        age: Int?,
        traits: String,
        backstory: String,
        goals: String,
        responseStyle: String,
        onSuccess: (String) -> Unit
    ) {
        viewModelScope.launch {
            _isCreating.value = true
            _error.value = null
            try {
                val persona = Persona(
                    id = UUID.randomUUID().toString(),
                    name = name,
                    relation = relation,
                    age = age,
                    traits = traits,
                    backstory = backstory,
                    goals = goals,
                    responseStyle = responseStyle,
                    profilePictureUrl = "https://ui-avatars.com/api/?name=${name.replace(" ", "+")}&size=512&background=random",
                    minWpm = 180,
                    maxWpm = 220,
                    memories = emptyList()
                )
                repository.savePersona(persona)
                onSuccess(persona.id)
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to create persona"
            } finally {
                _isCreating.value = false
            }
        }
    }
    
    fun generatePersonaFromPrompt(prompt: String, onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            _isCreating.value = true
            _error.value = null
            try {
                val persona = repository.generatePersonaFromPrompt(prompt)
                val personaWithImage = persona.copy(
                    profilePictureUrl = "https://ui-avatars.com/api/?name=${persona.name.replace(" ", "+")}&size=512&background=random"
                )
                repository.savePersona(personaWithImage)
                onSuccess(personaWithImage.id)
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to generate persona"
            } finally {
                _isCreating.value = false
            }
        }
    }
}

class PersonaNewViewModelFactory(private val repository: SimuSoulRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return PersonaNewViewModel(repository) as T
    }
}
