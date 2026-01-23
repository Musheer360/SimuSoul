package com.simusoul.app.data

import com.simusoul.app.data.local.ChatDao
import com.simusoul.app.data.local.PersonaDao
import com.simusoul.app.data.local.PreferencesManager
import com.simusoul.app.data.models.*
import com.simusoul.app.data.remote.GeminiApiClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SimuSoulRepository(
    private val personaDao: PersonaDao,
    private val chatDao: ChatDao,
    private val preferencesManager: PreferencesManager,
    val geminiApiClient: GeminiApiClient
) {
    // Persona operations
    fun getAllPersonas(): Flow<List<Persona>> = personaDao.getAllPersonas()
    
    suspend fun getAllPersonasOnce(): List<Persona> = personaDao.getAllPersonasOnce()
    
    suspend fun getPersonaById(id: String): Persona? = personaDao.getPersonaById(id)
    
    suspend fun savePersona(persona: Persona) = personaDao.insertPersona(persona)
    
    suspend fun updatePersona(persona: Persona) = personaDao.updatePersona(persona)
    
    suspend fun deletePersona(id: String) {
        chatDao.deleteAllChatsByPersonaId(id)
        personaDao.deletePersonaById(id)
    }

    // Chat operations
    fun getChatsByPersonaId(personaId: String): Flow<List<ChatSession>> = 
        chatDao.getChatsByPersonaId(personaId)
    
    fun getChatHeadersByPersonaId(personaId: String): Flow<List<ChatSessionHeader>> = 
        chatDao.getChatsByPersonaId(personaId).map { chats ->
            chats.map { chat ->
                ChatSessionHeader(
                    id = chat.id,
                    personaId = chat.personaId,
                    title = chat.title,
                    createdAt = chat.createdAt,
                    updatedAt = chat.updatedAt,
                    summary = chat.summary,
                    lastSummarizedAtMessageCount = chat.lastSummarizedAtMessageCount
                )
            }
        }
    
    suspend fun getChatsByPersonaIdOnce(personaId: String): List<ChatSession> = 
        chatDao.getChatsByPersonaIdOnce(personaId)
    
    suspend fun getChatById(id: String): ChatSession? = chatDao.getChatById(id)
    
    suspend fun saveChat(chat: ChatSession) = chatDao.insertChat(chat)
    
    suspend fun updateChat(chat: ChatSession) = chatDao.updateChat(chat)
    
    suspend fun deleteChat(id: String) = chatDao.deleteChatById(id)
    
    suspend fun deleteAllChatsByPersonaId(personaId: String) = 
        chatDao.deleteAllChatsByPersonaId(personaId)

    // User details operations
    val userDetails: Flow<UserDetails> = preferencesManager.userDetails
    
    suspend fun getUserDetails(): UserDetails = preferencesManager.getUserDetails()
    
    suspend fun saveUserDetails(userDetails: UserDetails) = 
        preferencesManager.saveUserDetails(userDetails)

    // API keys operations
    val apiKeys: Flow<ApiKeys> = preferencesManager.apiKeys
    
    suspend fun getApiKeys(): ApiKeys = preferencesManager.getApiKeys()
    
    suspend fun saveApiKeys(apiKeys: ApiKeys) = preferencesManager.saveApiKeys(apiKeys)

    // Theme operations
    val themeMode: Flow<String> = preferencesManager.themeMode
    
    suspend fun setThemeMode(mode: String) = preferencesManager.setThemeMode(mode)

    // Clear all data
    suspend fun clearAllData() {
        personaDao.getAllPersonasOnce().forEach { 
            personaDao.deletePersona(it) 
        }
        preferencesManager.clearAllData()
    }

    // Check if test mode is active
    suspend fun isTestModeActive(): Boolean {
        val keys = getApiKeys()
        return geminiApiClient.isTestModeActive(keys)
    }
}
