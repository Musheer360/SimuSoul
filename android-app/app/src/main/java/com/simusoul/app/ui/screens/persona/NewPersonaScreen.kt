package com.simusoul.app.ui.screens.persona

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.models.ChatMessage
import com.simusoul.app.data.models.ChatSession
import com.simusoul.app.data.models.Persona
import com.simusoul.app.data.remote.*
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewPersonaScreen(
    repository: SimuSoulRepository,
    onNavigateBack: () -> Unit,
    onPersonaCreated: (String) -> Unit
) {
    val colors = SimuSoulTheme.colors
    val scope = rememberCoroutineScope()
    
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Manual", "AI Generate", "Clone Chat")
    
    // Form state
    var name by remember { mutableStateOf("") }
    var relation by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var traits by remember { mutableStateOf("") }
    var backstory by remember { mutableStateOf("") }
    var goals by remember { mutableStateOf("") }
    var responseStyle by remember { mutableStateOf("") }
    
    // AI generation state
    var prompt by remember { mutableStateOf("") }
    var isGeneratingFull by remember { mutableStateOf(false) }
    var isGeneratingDetails by remember { mutableStateOf(false) }
    var isCreating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    // Clone chat state
    var chatContent by remember { mutableStateOf("") }
    var personNameForClone by remember { mutableStateOf("") }
    var isGeneratingFromChat by remember { mutableStateOf(false) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Persona") },
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
                    modifier = Modifier.padding(20.dp)
                ) {
                    Text(
                        text = "Create a New Persona",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = colors.foreground,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Text(
                        text = "Bring your character to life. Fill out the details manually or use AI to generate them for you.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Tab selection
                    TabRow(
                        selectedTabIndex = selectedTab,
                        containerColor = colors.secondary,
                        contentColor = colors.foreground,
                        indicator = { tabPositions ->
                            TabRowDefaults.SecondaryIndicator(
                                modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                                color = colors.primary
                            )
                        }
                    ) {
                        tabs.forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                text = {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        if (index == 1) {
                                            Icon(
                                                imageVector = Icons.Default.AutoAwesome,
                                                contentDescription = null,
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                        } else if (index == 2) {
                                            Icon(
                                                imageVector = Icons.Default.Upload,
                                                contentDescription = null,
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                        }
                                        Text(
                                            text = title,
                                            style = MaterialTheme.typography.labelMedium
                                        )
                                    }
                                }
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    when (selectedTab) {
                        0 -> ManualTab(
                            name = name,
                            onNameChange = { name = it },
                            relation = relation,
                            onRelationChange = { relation = it },
                            age = age,
                            onAgeChange = { age = it },
                            traits = traits,
                            onTraitsChange = { traits = it },
                            backstory = backstory,
                            onBackstoryChange = { backstory = it },
                            goals = goals,
                            onGoalsChange = { goals = it },
                            responseStyle = responseStyle,
                            onResponseStyleChange = { responseStyle = it },
                            isCreating = isCreating,
                            isGeneratingDetails = isGeneratingDetails,
                            error = error,
                            onGenerateDetails = {
                                scope.launch {
                                    if (name.isBlank() || relation.isBlank()) {
                                        error = "Please provide a Name and Relationship to generate details."
                                        return@launch
                                    }
                                    isGeneratingDetails = true
                                    error = null
                                    try {
                                        val apiKeys = repository.getApiKeys()
                                        val isTestMode = repository.isTestModeActive()
                                        val userDetails = repository.getUserDetails()
                                        
                                        val requestBody = buildGenerateDetailsRequest(
                                            name = name,
                                            relation = relation,
                                            userName = userDetails.name,
                                            userAbout = userDetails.about,
                                            isTestMode = isTestMode
                                        )
                                        
                                        val response = repository.geminiApiClient.callGeminiApi(
                                            "gemini-2.0-flash:generateContent",
                                            requestBody,
                                            apiKeys
                                        )
                                        
                                        val result = parseGenerateDetailsResponse(response)
                                        traits = result.traits
                                        backstory = result.backstory
                                        goals = result.goals
                                        responseStyle = result.responseStyle
                                        result.age?.let { age = it.toString() }
                                    } catch (e: Exception) {
                                        error = e.message ?: "Failed to generate details"
                                    } finally {
                                        isGeneratingDetails = false
                                    }
                                }
                            },
                            onSubmit = {
                                scope.launch {
                                    isCreating = true
                                    error = null
                                    try {
                                        createPersona(
                                            repository = repository,
                                            name = name,
                                            relation = relation,
                                            age = age.toIntOrNull(),
                                            traits = traits,
                                            backstory = backstory,
                                            goals = goals,
                                            responseStyle = responseStyle,
                                            onSuccess = { personaId ->
                                                onPersonaCreated(personaId)
                                            },
                                            onError = { error = it }
                                        )
                                    } finally {
                                        isCreating = false
                                    }
                                }
                            }
                        )
                        
                        1 -> AIGenerateTab(
                            prompt = prompt,
                            onPromptChange = { prompt = it },
                            isGenerating = isGeneratingFull,
                            onGenerate = {
                                scope.launch {
                                    isGeneratingFull = true
                                    error = null
                                    try {
                                        val apiKeys = repository.getApiKeys()
                                        val isTestMode = repository.isTestModeActive()
                                        val userDetails = repository.getUserDetails()
                                        
                                        val requestBody = buildGenerateFullPersonaRequest(
                                            prompt = prompt,
                                            userName = userDetails.name,
                                            userAbout = userDetails.about,
                                            isTestMode = isTestMode
                                        )
                                        
                                        val response = repository.geminiApiClient.callGeminiApi(
                                            "gemini-2.0-flash:generateContent",
                                            requestBody,
                                            apiKeys
                                        )
                                        
                                        val result = parseGeneratePersonaResponse(response)
                                        name = result.name
                                        relation = result.relation
                                        result.age?.let { age = it.toString() }
                                        traits = result.traits
                                        backstory = result.backstory
                                        goals = result.goals
                                        responseStyle = result.responseStyle
                                        
                                        selectedTab = 0 // Switch to manual tab
                                    } catch (e: Exception) {
                                        error = e.message ?: "Failed to generate persona"
                                    } finally {
                                        isGeneratingFull = false
                                    }
                                }
                            }
                        )
                        
                        2 -> CloneChatTab(
                            personName = personNameForClone,
                            onPersonNameChange = { personNameForClone = it },
                            chatContent = chatContent,
                            onChatContentChange = { chatContent = it },
                            isGenerating = isGeneratingFromChat,
                            error = error,
                            onGenerate = {
                                scope.launch {
                                    isGeneratingFromChat = true
                                    error = null
                                    try {
                                        val apiKeys = repository.getApiKeys()
                                        val userDetails = repository.getUserDetails()
                                        
                                        val requestBody = buildGenerateFromChatRequest(
                                            chatContent = chatContent,
                                            personName = personNameForClone,
                                            userName = userDetails.name,
                                            userAbout = userDetails.about
                                        )
                                        
                                        val response = repository.geminiApiClient.callGeminiApi(
                                            "gemini-2.0-flash:generateContent",
                                            requestBody,
                                            apiKeys
                                        )
                                        
                                        val result = parseGeneratePersonaResponse(response)
                                        name = result.name
                                        relation = result.relation
                                        result.age?.let { age = it.toString() }
                                        traits = result.traits
                                        backstory = result.backstory
                                        goals = result.goals
                                        responseStyle = result.responseStyle
                                        
                                        selectedTab = 0 // Switch to manual tab
                                    } catch (e: Exception) {
                                        error = e.message ?: "Failed to analyze chat"
                                    } finally {
                                        isGeneratingFromChat = false
                                    }
                                }
                            }
                        )
                    }
                    
                    if (error != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = colors.destructive.copy(alpha = 0.1f)
                            )
                        ) {
                            Text(
                                text = error!!,
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.destructive,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ManualTab(
    name: String,
    onNameChange: (String) -> Unit,
    relation: String,
    onRelationChange: (String) -> Unit,
    age: String,
    onAgeChange: (String) -> Unit,
    traits: String,
    onTraitsChange: (String) -> Unit,
    backstory: String,
    onBackstoryChange: (String) -> Unit,
    goals: String,
    onGoalsChange: (String) -> Unit,
    responseStyle: String,
    onResponseStyleChange: (String) -> Unit,
    isCreating: Boolean,
    isGeneratingDetails: Boolean,
    error: String?,
    onGenerateDetails: () -> Unit,
    onSubmit: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("Name") },
            placeholder = { Text("e.g., Captain Eva Rostova") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = relation,
                onValueChange = onRelationChange,
                label = { Text("Relationship") },
                placeholder = { Text("e.g., Best friend") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            
            OutlinedTextField(
                value = age,
                onValueChange = { if (it.all { c -> c.isDigit() }) onAgeChange(it) },
                label = { Text("Age") },
                placeholder = { Text("28") },
                modifier = Modifier.weight(0.5f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
        }
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Traits & Details",
                style = MaterialTheme.typography.labelLarge,
                color = colors.foreground
            )
            
            TextButton(
                onClick = onGenerateDetails,
                enabled = !isGeneratingDetails
            ) {
                if (isGeneratingDetails) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
                Text("Generate Details")
            }
        }
        
        OutlinedTextField(
            value = traits,
            onValueChange = onTraitsChange,
            label = { Text("Traits") },
            placeholder = { Text("e.g., Stoic, resourceful, former-spy...") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
            maxLines = 4
        )
        
        Text(
            text = "This will be used to generate the profile picture and influence their personality.",
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground
        )
        
        OutlinedTextField(
            value = backstory,
            onValueChange = onBackstoryChange,
            label = { Text("Backstory") },
            placeholder = { Text("Describe the character's history and experiences.") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 4,
            maxLines = 6
        )
        
        OutlinedTextField(
            value = goals,
            onValueChange = onGoalsChange,
            label = { Text("Goals") },
            placeholder = { Text("What does this character want to achieve?") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
            maxLines = 4
        )
        
        OutlinedTextField(
            value = responseStyle,
            onValueChange = onResponseStyleChange,
            label = { Text("Response Style") },
            placeholder = { Text("e.g., Talks like a Gen-Z, uses a lot of slang and emojis...") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
            maxLines = 5
        )
        
        Text(
            text = "Define how the persona communicates. This guides their tone, language, and personality in chat.",
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Button(
            onClick = onSubmit,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isCreating && name.isNotBlank() && relation.isNotBlank() && 
                      traits.isNotBlank() && backstory.isNotBlank() && 
                      goals.isNotBlank() && responseStyle.isNotBlank(),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                contentColor = colors.primaryForeground
            )
        ) {
            if (isCreating) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    color = colors.primaryForeground,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Creating Persona...")
            } else {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Create Persona")
            }
        }
    }
}

@Composable
private fun AIGenerateTab(
    prompt: String,
    onPromptChange: (String) -> Unit,
    isGenerating: Boolean,
    onGenerate: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Describe your character idea",
            style = MaterialTheme.typography.labelLarge,
            color = colors.foreground
        )
        
        OutlinedTextField(
            value = prompt,
            onValueChange = onPromptChange,
            placeholder = { Text("e.g., A badass pokemon trainer from the future who time-traveled to the past.") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 4,
            maxLines = 6
        )
        
        Button(
            onClick = onGenerate,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isGenerating && prompt.isNotBlank(),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                contentColor = colors.primaryForeground
            )
        ) {
            if (isGenerating) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    color = colors.primaryForeground,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generating...")
            } else {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generate Persona from Prompt")
            }
        }
    }
}

@Composable
private fun CloneChatTab(
    personName: String,
    onPersonNameChange: (String) -> Unit,
    chatContent: String,
    onChatContentChange: (String) -> Unit,
    isGenerating: Boolean,
    error: String?,
    onGenerate: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedTextField(
            value = personName,
            onValueChange = onPersonNameChange,
            label = { Text("Person's Name in Chat") },
            placeholder = { Text("e.g., Sarah, John") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        
        Text(
            text = "Enter the exact name as it appears in the WhatsApp chat.",
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground
        )
        
        OutlinedTextField(
            value = chatContent,
            onValueChange = onChatContentChange,
            label = { Text("Paste Chat Content") },
            placeholder = { Text("Paste your WhatsApp chat export here...") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 8,
            maxLines = 12
        )
        
        Text(
            text = "Paste the exported WhatsApp chat. Minimum 10 messages required.",
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground
        )
        
        Button(
            onClick = onGenerate,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isGenerating && chatContent.isNotBlank() && personName.isNotBlank(),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                contentColor = colors.primaryForeground
            )
        ) {
            if (isGenerating) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    color = colors.primaryForeground,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Analyzing Chat...")
            } else {
                Icon(
                    imageVector = Icons.Default.Upload,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Clone from Chat")
            }
        }
    }
}

// Helper functions for API requests
private fun buildGenerateDetailsRequest(
    name: String,
    relation: String,
    userName: String?,
    userAbout: String?,
    isTestMode: Boolean
): Map<String, Any> {
    val prompt = """
        Generate detailed character information for a persona named "$name" who is described as "$relation".
        ${userName?.let { "The user's name is $it." } ?: ""}
        ${userAbout?.let { "About the user: $it" } ?: ""}
        
        Return a JSON object with these fields:
        - traits: string (personality traits, habits, quirks)
        - backstory: string (character history and experiences)
        - goals: string (what the character wants to achieve)
        - responseStyle: string (how they communicate - tone, language style, emoji usage)
        - age: number (optional, suggested age)
        
        Make the character interesting and well-developed.
    """.trimIndent()
    
    return mapOf(
        "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
        "generationConfig" to mapOf(
            "temperature" to 0.9,
            "responseMimeType" to "application/json"
        )
    )
}

private fun buildGenerateFullPersonaRequest(
    prompt: String,
    userName: String?,
    userAbout: String?,
    isTestMode: Boolean
): Map<String, Any> {
    val fullPrompt = """
        Create a complete character based on this description: "$prompt"
        ${userName?.let { "The user's name is $it." } ?: ""}
        ${userAbout?.let { "About the user: $it" } ?: ""}
        
        Return a JSON object with these fields:
        - name: string
        - relation: string (relationship to the user)
        - age: number (optional)
        - traits: string (personality traits, habits, quirks)
        - backstory: string (character history and experiences)
        - goals: string (what the character wants to achieve)
        - responseStyle: string (how they communicate - tone, language style, emoji usage)
        - minWpm: number (typing speed min, default 40)
        - maxWpm: number (typing speed max, default 80)
        
        Make the character interesting and well-developed.
    """.trimIndent()
    
    return mapOf(
        "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to fullPrompt)))),
        "generationConfig" to mapOf(
            "temperature" to 0.9,
            "responseMimeType" to "application/json"
        )
    )
}

private fun buildGenerateFromChatRequest(
    chatContent: String,
    personName: String,
    userName: String?,
    userAbout: String?
): Map<String, Any> {
    val prompt = """
        Analyze this chat conversation and create a persona based on the person named "$personName".
        ${userName?.let { "The user's name is $it." } ?: ""}
        ${userAbout?.let { "About the user: $it" } ?: ""}
        
        Chat content:
        $chatContent
        
        Return a JSON object with these fields:
        - name: string
        - relation: string (relationship to the user based on chat)
        - age: number (estimated from chat context, optional)
        - traits: string (personality traits observed in chat)
        - backstory: string (inferred background)
        - goals: string (interests and motivations)
        - responseStyle: string (how they communicate based on chat patterns)
        - minWpm: number (typing speed min, default 40)
        - maxWpm: number (typing speed max, default 80)
    """.trimIndent()
    
    return mapOf(
        "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
        "generationConfig" to mapOf(
            "temperature" to 0.7,
            "responseMimeType" to "application/json"
        )
    )
}

private fun parseGenerateDetailsResponse(response: GeminiResponse): GenerateDetailsOutput {
    val text = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text ?: ""
    return try {
        com.google.gson.Gson().fromJson(text, GenerateDetailsOutput::class.java)
    } catch (e: Exception) {
        GenerateDetailsOutput()
    }
}

private fun parseGeneratePersonaResponse(response: GeminiResponse): GeneratePersonaOutput {
    val text = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text ?: ""
    return try {
        com.google.gson.Gson().fromJson(text, GeneratePersonaOutput::class.java)
    } catch (e: Exception) {
        GeneratePersonaOutput()
    }
}

private suspend fun createPersona(
    repository: SimuSoulRepository,
    name: String,
    relation: String,
    age: Int?,
    traits: String,
    backstory: String,
    goals: String,
    responseStyle: String,
    onSuccess: (String) -> Unit,
    onError: (String) -> Unit
) {
    try {
        // Validate required fields
        if (name.isBlank() || relation.isBlank() || traits.isBlank() || 
            backstory.isBlank() || goals.isBlank() || responseStyle.isBlank()) {
            onError("All fields are required.")
            return
        }
        
        // Generate a placeholder avatar
        val profilePictureUrl = generatePlaceholderAvatar(name)
        
        val personaId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        
        val persona = Persona(
            id = personaId,
            name = name,
            relation = relation,
            age = age,
            traits = traits,
            backstory = backstory,
            goals = goals,
            responseStyle = responseStyle,
            profilePictureUrl = profilePictureUrl,
            minWpm = 40,
            maxWpm = 80,
            memories = emptyList()
        )
        
        // Create initial chat
        val chatId = UUID.randomUUID().toString()
        val newChat = ChatSession(
            id = chatId,
            personaId = personaId,
            title = "New Chat",
            messages = emptyList(),
            createdAt = now,
            updatedAt = now
        )
        
        // Save both
        repository.savePersona(persona)
        repository.saveChat(newChat)
        
        onSuccess(personaId)
    } catch (e: Exception) {
        onError(e.message ?: "Failed to create persona")
    }
}

private fun generatePlaceholderAvatar(name: String): String {
    // Generate a simple SVG-based placeholder avatar
    val initials = name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
    val colors = listOf(
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
        "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
    )
    val bgColor = colors[name.hashCode().mod(colors.size).let { if (it < 0) it + colors.size else it }]
    
    val svg = """
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="$bgColor"/>
            <text x="100" y="120" font-family="Arial" font-size="72" font-weight="bold" fill="white" text-anchor="middle">$initials</text>
        </svg>
    """.trimIndent()
    
    val base64 = android.util.Base64.encodeToString(svg.toByteArray(), android.util.Base64.NO_WRAP)
    return "data:image/svg+xml;base64,$base64"
}
