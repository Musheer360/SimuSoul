package com.simusoul.app.ui.screens.chat

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.models.*
import com.simusoul.app.data.remote.*
import com.simusoul.app.ui.components.ConfirmDialog
import com.simusoul.app.ui.components.LoadingIndicator
import com.simusoul.app.ui.components.TypingIndicator
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    personaId: String,
    repository: SimuSoulRepository,
    onNavigateBack: () -> Unit,
    onNavigateToPersonas: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    
    // State
    var persona by remember { mutableStateOf<Persona?>(null) }
    var chatHeaders by remember { mutableStateOf<List<ChatSessionHeader>>(emptyList()) }
    var activeChat by remember { mutableStateOf<ChatSession?>(null) }
    var activeChatId by remember { mutableStateOf<String?>(null) }
    var userDetails by remember { mutableStateOf(UserDetails()) }
    
    var input by remember { mutableStateOf("") }
    var isAiResponding by remember { mutableStateOf(false) }
    var isAiTyping by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    var isSidebarOpen by remember { mutableStateOf(false) }
    var showDeleteChatDialog by remember { mutableStateOf<ChatSessionHeader?>(null) }
    var showClearAllDialog by remember { mutableStateOf(false) }
    var showDeletePersonaDialog by remember { mutableStateOf(false) }
    var showMemoryDialog by remember { mutableStateOf(false) }
    var showEditPersonaDialog by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    
    // Load data
    LaunchedEffect(personaId) {
        isLoading = true
        persona = repository.getPersonaById(personaId)
        userDetails = repository.getUserDetails()
        
        // Load chat headers
        val chats = repository.getChatsByPersonaIdOnce(personaId)
        chatHeaders = chats.map { chat ->
            ChatSessionHeader(
                id = chat.id,
                personaId = chat.personaId,
                title = chat.title,
                createdAt = chat.createdAt,
                updatedAt = chat.updatedAt,
                summary = chat.summary
            )
        }.sortedByDescending { it.updatedAt }
        
        // Create or select a chat
        if (chats.isEmpty()) {
            // Create new chat
            val now = System.currentTimeMillis()
            val newChat = ChatSession(
                id = UUID.randomUUID().toString(),
                personaId = personaId,
                title = "New Chat",
                messages = emptyList(),
                createdAt = now,
                updatedAt = now
            )
            repository.saveChat(newChat)
            activeChat = newChat
            activeChatId = newChat.id
            chatHeaders = listOf(ChatSessionHeader(
                id = newChat.id,
                personaId = newChat.personaId,
                title = newChat.title,
                createdAt = newChat.createdAt,
                updatedAt = newChat.updatedAt
            ))
        } else {
            // Select most recent chat
            val mostRecent = chats.maxByOrNull { it.updatedAt }
            activeChat = mostRecent
            activeChatId = mostRecent?.id
        }
        
        isLoading = false
    }
    
    // Scroll to bottom when messages change
    LaunchedEffect(activeChat?.messages?.size) {
        activeChat?.messages?.let {
            if (it.isNotEmpty()) {
                listState.animateScrollToItem(it.size - 1)
            }
        }
    }
    
    // Handle sending message
    fun sendMessage() {
        val trimmedInput = input.trim()
        if (trimmedInput.isBlank() || persona == null || activeChat == null || isAiResponding) return
        
        val userMessage = ChatMessage(
            role = "user",
            content = trimmedInput
        )
        
        val now = System.currentTimeMillis()
        val updatedChat = activeChat!!.copy(
            messages = activeChat!!.messages + userMessage,
            updatedAt = now
        )
        
        activeChat = updatedChat
        input = ""
        
        scope.launch {
            repository.saveChat(updatedChat)
            
            // Update chat headers
            chatHeaders = chatHeaders.map { h ->
                if (h.id == activeChatId) h.copy(updatedAt = now) else h
            }.sortedByDescending { it.updatedAt }
            
            // Get AI response
            isAiResponding = true
            isAiTyping = true
            error = null
            
            try {
                val apiKeys = repository.getApiKeys()
                val isTestMode = repository.isTestModeActive()
                val allChats = repository.getChatsByPersonaIdOnce(personaId)
                    .filter { it.id != activeChatId }
                
                val currentDateTime = SimpleDateFormat("EEEE, MMMM d, yyyy 'at' h:mm a", Locale.getDefault())
                    .format(Date())
                val currentDateForMemory = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    .format(Date())
                
                val requestBody = buildChatRequest(
                    persona = persona!!,
                    userDetails = userDetails,
                    chatHistory = updatedChat.messages.dropLast(1),
                    userMessages = listOf(trimmedInput),
                    currentDateTime = currentDateTime,
                    currentDateForMemory = currentDateForMemory,
                    allChats = allChats,
                    isTestMode = isTestMode
                )
                
                val response = repository.geminiApiClient.callGeminiApi(
                    "gemini-2.0-flash:generateContent",
                    requestBody,
                    apiKeys
                )
                
                val chatResponse = parseChatResponse(response)
                
                // Simulate typing delay
                val typingDelayMs = (1000L..3000L).random()
                delay(typingDelayMs)
                isAiTyping = false
                
                // Add AI responses
                if (chatResponse.response.isNotEmpty()) {
                    var currentChat = activeChat!!
                    for (messageContent in chatResponse.response) {
                        val assistantMessage = ChatMessage(
                            role = "assistant",
                            content = messageContent
                        )
                        currentChat = currentChat.copy(
                            messages = currentChat.messages + assistantMessage,
                            updatedAt = System.currentTimeMillis()
                        )
                    }
                    activeChat = currentChat
                    repository.saveChat(currentChat)
                    
                    // Generate title for new chat
                    if (updatedChat.messages.size == 1 && updatedChat.title == "New Chat") {
                        try {
                            val titleRequest = buildGenerateTitleRequest(
                                userMessage = trimmedInput,
                                assistantResponse = chatResponse.response.firstOrNull() ?: ""
                            )
                            val titleResponse = repository.geminiApiClient.callGeminiApi(
                                "gemini-2.0-flash:generateContent",
                                titleRequest,
                                apiKeys
                            )
                            val title = parseTitleResponse(titleResponse)
                            if (title.isNotBlank()) {
                                val chatWithTitle = currentChat.copy(title = title)
                                activeChat = chatWithTitle
                                repository.saveChat(chatWithTitle)
                                chatHeaders = chatHeaders.map { h ->
                                    if (h.id == activeChatId) h.copy(title = title) else h
                                }
                            }
                        } catch (e: Exception) {
                            // Ignore title generation errors
                        }
                    }
                }
                
                // Handle memory updates
                if (!chatResponse.newMemories.isNullOrEmpty() || !chatResponse.removedMemories.isNullOrEmpty()) {
                    var memories = persona!!.memories.toMutableList()
                    chatResponse.removedMemories?.forEach { memories.remove(it) }
                    chatResponse.newMemories?.forEach { 
                        if (!memories.contains(it)) memories.add(it) 
                    }
                    persona = persona!!.copy(memories = memories)
                    repository.savePersona(persona!!)
                }
                
            } catch (e: Exception) {
                error = e.message ?: "Failed to get response"
                isAiTyping = false
            } finally {
                isAiResponding = false
                isAiTyping = false
            }
        }
    }
    
    // Handle new chat
    fun createNewChat() {
        scope.launch {
            val now = System.currentTimeMillis()
            val newChat = ChatSession(
                id = UUID.randomUUID().toString(),
                personaId = personaId,
                title = "New Chat",
                messages = emptyList(),
                createdAt = now,
                updatedAt = now
            )
            repository.saveChat(newChat)
            activeChat = newChat
            activeChatId = newChat.id
            
            val newHeader = ChatSessionHeader(
                id = newChat.id,
                personaId = newChat.personaId,
                title = newChat.title,
                createdAt = newChat.createdAt,
                updatedAt = newChat.updatedAt
            )
            chatHeaders = listOf(newHeader) + chatHeaders
            isSidebarOpen = false
        }
    }
    
    // Handle chat selection
    fun selectChat(header: ChatSessionHeader) {
        scope.launch {
            val chat = repository.getChatById(header.id)
            activeChat = chat
            activeChatId = header.id
            isSidebarOpen = false
        }
    }
    
    // Handle chat deletion
    fun deleteChat(header: ChatSessionHeader) {
        scope.launch {
            repository.deleteChat(header.id)
            chatHeaders = chatHeaders.filter { it.id != header.id }
            
            if (activeChatId == header.id) {
                if (chatHeaders.isNotEmpty()) {
                    val first = chatHeaders.first()
                    val chat = repository.getChatById(first.id)
                    activeChat = chat
                    activeChatId = first.id
                } else {
                    createNewChat()
                }
            }
            showDeleteChatDialog = null
        }
    }
    
    // Handle clear all chats
    fun clearAllChats() {
        scope.launch {
            repository.deleteAllChatsByPersonaId(personaId)
            chatHeaders = emptyList()
            createNewChat()
            showClearAllDialog = false
        }
    }
    
    // Handle persona deletion
    fun deletePersona() {
        scope.launch {
            repository.deletePersona(personaId)
            showDeletePersonaDialog = false
            onNavigateToPersonas()
        }
    }
    
    if (isLoading || persona == null) {
        LoadingIndicator()
        return
    }
    
    // Dialogs
    showDeleteChatDialog?.let { header ->
        ConfirmDialog(
            title = "Delete Chat?",
            message = "This will permanently delete \"${header.title}\". This cannot be undone.",
            confirmText = "Delete",
            isDestructive = true,
            onConfirm = { deleteChat(header) },
            onDismiss = { showDeleteChatDialog = null }
        )
    }
    
    if (showClearAllDialog) {
        ConfirmDialog(
            title = "Clear All Chats?",
            message = "This will permanently delete all chat history for ${persona!!.name}. This cannot be undone.",
            confirmText = "Delete All",
            isDestructive = true,
            onConfirm = { clearAllChats() },
            onDismiss = { showClearAllDialog = false }
        )
    }
    
    if (showDeletePersonaDialog) {
        ConfirmDialog(
            title = "Delete Persona?",
            message = "This will permanently delete ${persona!!.name} and all associated chats. This cannot be undone.",
            confirmText = "Delete",
            isDestructive = true,
            onConfirm = { deletePersona() },
            onDismiss = { showDeletePersonaDialog = false }
        )
    }
    
    if (showMemoryDialog) {
        MemoryDialog(
            persona = persona!!,
            onDismiss = { showMemoryDialog = false },
            onDeleteMemory = { memory ->
                scope.launch {
                    val updatedMemories = persona!!.memories.filter { it != memory }
                    persona = persona!!.copy(memories = updatedMemories)
                    repository.savePersona(persona!!)
                }
            }
        )
    }
    
    if (showEditPersonaDialog) {
        EditPersonaDialog(
            persona = persona!!,
            onDismiss = { showEditPersonaDialog = false },
            onSave = { updatedPersona ->
                scope.launch {
                    persona = updatedPersona
                    repository.savePersona(updatedPersona)
                    showEditPersonaDialog = false
                }
            }
        )
    }
    
    Box(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxSize()) {
            // Main chat area
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(colors.background.copy(alpha = 0.8f))
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.background)
                        .padding(horizontal = 8.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = onNavigateBack,
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = colors.mutedForeground
                        )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("All Personas")
                    }
                    
                    Spacer(modifier = Modifier.weight(1f))
                    
                    FilledTonalIconButton(
                        onClick = { isSidebarOpen = !isSidebarOpen },
                        colors = IconButtonDefaults.filledTonalIconButtonColors(
                            containerColor = Color.Transparent,
                            contentColor = colors.foreground
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Menu"
                        )
                    }
                }
                
                HorizontalDivider(color = colors.border)
                
                // Messages area
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    if (activeChat?.messages.isNullOrEmpty() && !isAiTyping) {
                        // Empty state
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.SmartToy,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = colors.mutedForeground
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Start a conversation",
                                style = MaterialTheme.typography.titleLarge,
                                color = colors.mutedForeground
                            )
                            Text(
                                text = "Send a message to ${persona!!.name}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.mutedForeground
                            )
                        }
                    } else {
                        val messages = activeChat?.messages ?: emptyList()
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            contentPadding = PaddingValues(vertical = 8.dp)
                        ) {
                            itemsIndexed(messages) { index, message ->
                                val prevMessage = messages.getOrNull(index - 1)
                                val nextMessage = messages.getOrNull(index + 1)
                                val isFirstInSequence = prevMessage?.role != message.role
                                val isLastInSequence = nextMessage?.role != message.role
                                
                                MessageBubble(
                                    message = message,
                                    isUser = message.role == "user",
                                    isFirstInSequence = isFirstInSequence,
                                    isLastInSequence = isLastInSequence
                                )
                            }
                            
                            if (isAiTyping) {
                                item {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 16.dp),
                                        horizontalArrangement = Arrangement.Start
                                    ) {
                                        TypingIndicator()
                                    }
                                }
                            }
                        }
                    }
                    
                    // Error message
                    if (error != null) {
                        Card(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = colors.destructive.copy(alpha = 0.9f)
                            )
                        ) {
                            Text(
                                text = error!!,
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.destructiveForeground,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    }
                }
                
                // Input area
                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    HorizontalDivider(color = colors.border)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(colors.background)
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.Bottom
                    ) {
                        OutlinedTextField(
                            value = input,
                            onValueChange = { input = it },
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 48.dp, max = 150.dp),
                            placeholder = { 
                                Text(
                                    "Message ${persona!!.name}...",
                                    color = colors.mutedForeground
                                ) 
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = colors.border,
                                unfocusedBorderColor = colors.border,
                                focusedContainerColor = colors.secondary,
                                unfocusedContainerColor = colors.secondary,
                                cursorColor = colors.foreground
                            ),
                            shape = RoundedCornerShape(24.dp),
                            maxLines = 5
                        )
                        
                        Spacer(modifier = Modifier.width(12.dp))
                        
                        FilledIconButton(
                            onClick = { sendMessage() },
                            enabled = input.isNotBlank() && !isAiResponding,
                            modifier = Modifier.size(48.dp),
                            colors = IconButtonDefaults.filledIconButtonColors(
                                containerColor = colors.primary,
                                contentColor = colors.primaryForeground,
                                disabledContainerColor = colors.muted,
                                disabledContentColor = colors.mutedForeground
                            )
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Send",
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
        
        // Sidebar overlay
        AnimatedVisibility(
            visible = isSidebarOpen,
            enter = slideInHorizontally(initialOffsetX = { it }),
            exit = slideOutHorizontally(targetOffsetX = { it })
        ) {
            Box(
                modifier = Modifier.fillMaxSize()
            ) {
                // Backdrop
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.5f))
                        .clickable { isSidebarOpen = false }
                )
                
                // Sidebar content
                Surface(
                    modifier = Modifier
                        .width(300.dp)
                        .fillMaxHeight()
                        .align(Alignment.CenterEnd),
                    color = colors.card
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        // Persona header
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { 
                                    // Show persona management options
                                },
                            color = colors.card
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Avatar
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .clip(CircleShape)
                                        .border(2.dp, colors.primary.copy(alpha = 0.5f), CircleShape)
                                ) {
                                    PersonaAvatar(
                                        profilePictureUrl = persona!!.profilePictureUrl,
                                        name = persona!!.name,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                                
                                Spacer(modifier = Modifier.width(12.dp))
                                
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = persona!!.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = colors.foreground,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = persona!!.relation,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.mutedForeground,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                        
                        // Action buttons
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { showClearAllDialog = true },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Clear")
                            }
                            
                            OutlinedButton(
                                onClick = { createNewChat() },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("New")
                            }
                        }
                        
                        // Management buttons
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { showEditPersonaDialog = true },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Edit")
                            }
                            
                            OutlinedButton(
                                onClick = { showMemoryDialog = true },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Psychology,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Memory")
                            }
                        }
                        
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 8.dp),
                            color = colors.border
                        )
                        
                        // Chat list
                        LazyColumn(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            items(chatHeaders) { header ->
                                ChatListItem(
                                    header = header,
                                    isActive = header.id == activeChatId,
                                    onClick = { selectChat(header) },
                                    onDelete = { showDeleteChatDialog = header }
                                )
                            }
                        }
                        
                        HorizontalDivider(color = colors.border)
                        
                        // Delete persona button
                        TextButton(
                            onClick = { showDeletePersonaDialog = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = colors.destructive
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Delete Persona")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(
    message: ChatMessage,
    isUser: Boolean,
    isFirstInSequence: Boolean = true,
    isLastInSequence: Boolean = true
) {
    val colors = SimuSoulTheme.colors
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                top = if (isFirstInSequence) 16.dp else 2.dp,
                bottom = 0.dp
            ),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            modifier = Modifier.widthIn(max = 320.dp),
            shape = RoundedCornerShape(
                topStart = if (isUser) 16.dp else if (isFirstInSequence) 4.dp else 4.dp,
                topEnd = if (isUser) if (isFirstInSequence) 4.dp else 4.dp else 16.dp,
                bottomStart = if (isUser) 16.dp else if (isLastInSequence) 16.dp else 4.dp,
                bottomEnd = if (isUser) if (isLastInSequence) 16.dp else 4.dp else 16.dp
            ),
            color = if (isUser) colors.primary else colors.secondary
        ) {
            Text(
                text = message.content,
                style = MaterialTheme.typography.bodyMedium.copy(
                    lineHeight = 22.sp
                ),
                color = if (isUser) colors.primaryForeground else colors.foreground,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
            )
        }
    }
}

@Composable
private fun ChatListItem(
    header: ChatSessionHeader,
    isActive: Boolean,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        color = if (isActive) colors.secondary else colors.card
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = header.title,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isActive) colors.foreground else colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    modifier = Modifier.size(16.dp),
                    tint = colors.mutedForeground
                )
            }
        }
    }
}

@Composable
private fun PersonaAvatar(
    profilePictureUrl: String,
    name: String,
    modifier: Modifier = Modifier
) {
    if (profilePictureUrl.startsWith("data:image")) {
        val base64Data = profilePictureUrl.substringAfter("base64,")
        val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        if (bitmap != null) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = name,
                modifier = modifier,
                contentScale = ContentScale.Crop
            )
        }
    } else {
        // Placeholder
        Box(
            modifier = modifier.background(Color.Gray),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.firstOrNull()?.toString() ?: "?",
                style = MaterialTheme.typography.titleLarge,
                color = Color.White
            )
        }
    }
}

@Composable
private fun MemoryDialog(
    persona: Persona,
    onDismiss: () -> Unit,
    onDeleteMemory: (String) -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Memories for ${persona.name}") },
        text = {
            if (persona.memories.isEmpty()) {
                Text(
                    text = "No memories yet.",
                    color = colors.mutedForeground
                )
            } else {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(persona.memories.sorted()) { memory ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            color = colors.secondary
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = memory.replace(Regex("^\\d{4}-\\d{2}-\\d{2}: "), ""),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.foreground,
                                    modifier = Modifier.weight(1f)
                                )
                                IconButton(
                                    onClick = { onDeleteMemory(memory) },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete",
                                        modifier = Modifier.size(16.dp),
                                        tint = colors.destructive
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        },
        containerColor = colors.card
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditPersonaDialog(
    persona: Persona,
    onDismiss: () -> Unit,
    onSave: (Persona) -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    var name by remember { mutableStateOf(persona.name) }
    var relation by remember { mutableStateOf(persona.relation) }
    var traits by remember { mutableStateOf(persona.traits) }
    var backstory by remember { mutableStateOf(persona.backstory) }
    var goals by remember { mutableStateOf(persona.goals) }
    var responseStyle by remember { mutableStateOf(persona.responseStyle) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit ${persona.name}") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 400.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                
                OutlinedTextField(
                    value = relation,
                    onValueChange = { relation = it },
                    label = { Text("Relationship") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                
                OutlinedTextField(
                    value = traits,
                    onValueChange = { traits = it },
                    label = { Text("Traits") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 3
                )
                
                OutlinedTextField(
                    value = backstory,
                    onValueChange = { backstory = it },
                    label = { Text("Backstory") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4
                )
                
                OutlinedTextField(
                    value = goals,
                    onValueChange = { goals = it },
                    label = { Text("Goals") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 3
                )
                
                OutlinedTextField(
                    value = responseStyle,
                    onValueChange = { responseStyle = it },
                    label = { Text("Response Style") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(persona.copy(
                        name = name,
                        relation = relation,
                        traits = traits,
                        backstory = backstory,
                        goals = goals,
                        responseStyle = responseStyle
                    ))
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.primary,
                    contentColor = colors.primaryForeground
                )
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
        containerColor = colors.card
    )
}

// Helper functions for API requests
private fun buildChatRequest(
    persona: Persona,
    userDetails: UserDetails,
    chatHistory: List<ChatMessage>,
    userMessages: List<String>,
    currentDateTime: String,
    currentDateForMemory: String,
    allChats: List<ChatSession>,
    isTestMode: Boolean
): Map<String, Any> {
    val userIdentifier = userDetails.name.split(" ").firstOrNull() ?: "the user"
    
    val prompt = """
        <system>
        You ARE ${persona.name}. This is not roleplay - you are this person having a genuine conversation.
        </system>
        
        <identity>
        Backstory: ${persona.backstory}
        Traits: ${persona.traits}
        Goals: ${persona.goals}
        </identity>
        
        <communication_style>
        ${persona.responseStyle}
        </communication_style>
        
        <relationship>
        You are ${persona.relation} with $userIdentifier${persona.age?.let { " (you are $it years old)" } ?: ""}.
        </relationship>
        
        <current_context>
        Current time: $currentDateTime
        </current_context>
        
        <user_knowledge>
        What you know about $userIdentifier:
        ${if (persona.memories.isNotEmpty()) persona.memories.joinToString("\n") { "• $it" } else "• Still getting to know them"}
        </user_knowledge>
        
        ${if (chatHistory.isNotEmpty()) """
        <current_conversation>
        ${chatHistory.joinToString("\n") { "${if (it.role == "user") userIdentifier else "You"}: ${it.content}" }}
        </current_conversation>
        """ else ""}
        
        <new_message>
        $userIdentifier just said:
        ${userMessages.joinToString("\n") { "\"$it\"" }}
        </new_message>
        
        <response_guidelines>
        1. Be authentic - respond as yourself naturally
        2. Send 1-5 messages as you would in real texting
        3. Vary message length based on mood and context
        4. Never be repetitive or formulaic
        </response_guidelines>
        
        <memory_rules>
        ONLY create memories for MAJOR LIFE EVENTS:
        • New job, career change
        • New pet, pet passing away
        • Moving to new city/house
        • Marriage, engagement, divorce
        • Major health events
        • Death of family/friends
        
        DO NOT save: conversation topics, daily activities, preferences
        </memory_rules>
        
        <output_format>
        Respond with valid JSON:
        {
          "response": ["message1", "message2", ...],
          "newMemories": ["$currentDateForMemory: life event description"],
          "removedMemories": ["outdated memory to remove"],
          "shouldIgnore": false,
          "ignoreReason": ""
        }
        </output_format>
        
        Now respond as ${persona.name}. Be genuine and natural.
    """.trimIndent()
    
    return mapOf(
        "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
        "generationConfig" to mapOf(
            "temperature" to 1.0,
            "topK" to 40,
            "topP" to 0.95,
            "responseMimeType" to "application/json"
        )
    )
}

private fun buildGenerateTitleRequest(
    userMessage: String,
    assistantResponse: String
): Map<String, Any> {
    val prompt = """
        Generate a short, descriptive title (3-6 words) for this conversation:
        
        User: $userMessage
        Assistant: $assistantResponse
        
        Return only the title, no quotes or extra formatting.
    """.trimIndent()
    
    return mapOf(
        "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
        "generationConfig" to mapOf(
            "temperature" to 0.7,
            "maxOutputTokens" to 50
        )
    )
}

private fun parseChatResponse(response: GeminiResponse): ChatWithPersonaOutput {
    val text = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text ?: ""
    return try {
        com.google.gson.Gson().fromJson(text, ChatWithPersonaOutput::class.java)
    } catch (e: Exception) {
        // Try to extract just the response text if JSON parsing fails
        ChatWithPersonaOutput(response = listOf(text))
    }
}

private fun parseTitleResponse(response: GeminiResponse): String {
    return response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text?.trim() ?: ""
}
