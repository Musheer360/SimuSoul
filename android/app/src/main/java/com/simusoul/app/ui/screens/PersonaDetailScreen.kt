package com.simusoul.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.simusoul.app.SimuSoulApplication
import com.simusoul.app.data.model.*
import com.simusoul.app.data.repository.SimuSoulRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonaDetailScreen(
    personaId: String,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as SimuSoulApplication
    val viewModel: PersonaDetailViewModel = viewModel(
        factory = PersonaDetailViewModelFactory(app.repository, personaId)
    )
    
    val persona by viewModel.persona.collectAsState()
    val currentChat by viewModel.currentChat.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    
    // Auto scroll to bottom when new messages arrive
    LaunchedEffect(currentChat?.messages?.size) {
        if ((currentChat?.messages?.size ?: 0) > 0) {
            listState.animateScrollToItem(currentChat?.messages?.size ?: 0)
        }
    }
    
    if (isLoading || persona == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Header
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 3.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
                
                AsyncImage(
                    model = persona?.profilePictureUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            MaterialTheme.colorScheme.primaryContainer,
                            RoundedCornerShape(20.dp)
                        ),
                    contentScale = ContentScale.Crop
                )
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = persona?.name ?: "",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = persona?.relation ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                IconButton(onClick = { viewModel.createNewChat() }) {
                    Icon(Icons.Default.Add, contentDescription = "New Chat")
                }
            }
        }
        
        // Messages
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            state = listState,
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (currentChat?.messages?.isEmpty() == true) {
                item {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(32.dp)
                        ) {
                            AsyncImage(
                                model = persona?.profilePictureUrl,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(80.dp)
                                    .background(
                                        MaterialTheme.colorScheme.primaryContainer,
                                        RoundedCornerShape(40.dp)
                                    )
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Start a conversation with ${persona?.name}",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            
            items(currentChat?.messages ?: emptyList()) { message ->
                MessageBubble(message = message, isUser = message.role == "user")
            }
            
            if (isSending) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                repeat(3) { index ->
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .background(
                                                MaterialTheme.colorScheme.onSurfaceVariant,
                                                RoundedCornerShape(4.dp)
                                            )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Input
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 3.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.Bottom
            ) {
                OutlinedTextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Type a message...") },
                    shape = RoundedCornerShape(24.dp),
                    maxLines = 4
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                FilledIconButton(
                    onClick = {
                        if (messageText.isNotBlank()) {
                            viewModel.sendMessage(messageText)
                            messageText = ""
                        }
                    },
                    enabled = !isSending && messageText.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, contentDescription = "Send")
                }
            }
        }
    }
}

@Composable
fun MessageBubble(message: ChatMessage, isUser: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            shape = RoundedCornerShape(
                topStart = 12.dp,
                topEnd = 12.dp,
                bottomStart = if (isUser) 12.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 12.dp
            ),
            colors = CardDefaults.cardColors(
                containerColor = if (isUser) 
                    MaterialTheme.colorScheme.primary 
                else 
                    MaterialTheme.colorScheme.surfaceVariant
            ),
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Text(
                text = message.content,
                modifier = Modifier.padding(12.dp),
                color = if (isUser) 
                    MaterialTheme.colorScheme.onPrimary 
                else 
                    MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

// ViewModel
class PersonaDetailViewModel(
    private val repository: SimuSoulRepository,
    private val personaId: String
) : ViewModel() {
    private val _persona = MutableStateFlow<Persona?>(null)
    val persona: StateFlow<Persona?> = _persona.asStateFlow()
    
    private val _currentChat = MutableStateFlow<ChatSession?>(null)
    val currentChat: StateFlow<ChatSession?> = _currentChat.asStateFlow()
    
    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()
    
    init {
        loadPersona()
    }
    
    private fun loadPersona() {
        viewModelScope.launch {
            _isLoading.value = true
            _persona.value = repository.getPersonaById(personaId)
            
            // Load or create a chat session
            val chats = repository.getChatSessionsByPersona(personaId)
            if (chats.isEmpty()) {
                createNewChat()
            } else {
                _currentChat.value = chats.first()
            }
            
            _isLoading.value = false
        }
    }
    
    fun createNewChat() {
        viewModelScope.launch {
            val newChat = ChatSession(
                id = UUID.randomUUID().toString(),
                personaId = personaId,
                title = "New Chat",
                messages = emptyList(),
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            repository.saveChatSession(newChat)
            _currentChat.value = newChat
        }
    }
    
    fun sendMessage(text: String) {
        viewModelScope.launch {
            _isSending.value = true
            
            val userMessage = ChatMessage(role = "user", content = text)
            val updatedMessages = (_currentChat.value?.messages ?: emptyList()) + userMessage
            
            // Update chat with user message
            _currentChat.value = _currentChat.value?.copy(
                messages = updatedMessages,
                updatedAt = System.currentTimeMillis()
            )
            _currentChat.value?.let { repository.saveChatSession(it) }
            
            try {
                val persona = _persona.value ?: return@launch
                val userDetails = repository.getUserDetails().kotlinx.coroutines.flow.first()
                
                val response = repository.chatWithPersona(persona, updatedMessages, userDetails)
                val assistantMessage = ChatMessage(role = "assistant", content = response)
                
                val finalMessages = updatedMessages + assistantMessage
                _currentChat.value = _currentChat.value?.copy(
                    messages = finalMessages,
                    updatedAt = System.currentTimeMillis()
                )
                _currentChat.value?.let { repository.saveChatSession(it) }
            } catch (e: Exception) {
                // Show error message
                val errorMessage = ChatMessage(
                    role = "assistant",
                    content = "Sorry, I encountered an error: ${e.message}"
                )
                _currentChat.value = _currentChat.value?.copy(
                    messages = updatedMessages + errorMessage,
                    updatedAt = System.currentTimeMillis()
                )
                _currentChat.value?.let { repository.saveChatSession(it) }
            } finally {
                _isSending.value = false
            }
        }
    }
}

class PersonaDetailViewModelFactory(
    private val repository: SimuSoulRepository,
    private val personaId: String
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return PersonaDetailViewModel(repository, personaId) as T
    }
}
