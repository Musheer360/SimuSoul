package com.simusoul.app.data.repository

import com.simusoul.app.data.local.ChatSessionDao
import com.simusoul.app.data.local.PersonaDao
import com.simusoul.app.data.local.SettingsDataStore
import com.simusoul.app.data.model.*
import com.simusoul.app.data.remote.GeminiApiService
import com.simusoul.app.data.remote.GeminiRequest
import com.simusoul.app.data.remote.Content
import com.simusoul.app.data.remote.Part
import com.simusoul.app.data.remote.GenerationConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import java.util.*

class SimuSoulRepository(
    private val personaDao: PersonaDao,
    private val chatSessionDao: ChatSessionDao,
    private val settingsDataStore: SettingsDataStore,
    private val geminiApi: GeminiApiService
) {
    // Persona operations
    suspend fun getAllPersonas(): List<Persona> = personaDao.getAllPersonas()

    suspend fun getPersonaById(id: String): Persona? = personaDao.getPersonaById(id)

    suspend fun savePersona(persona: Persona) = personaDao.insertPersona(persona)

    suspend fun updatePersona(persona: Persona) = personaDao.updatePersona(persona)

    suspend fun deletePersona(persona: Persona) {
        personaDao.deletePersona(persona)
        chatSessionDao.deleteAllChatSessionsByPersona(persona.id)
    }

    // Chat operations
    suspend fun getChatSessionsByPersona(personaId: String): List<ChatSession> =
        chatSessionDao.getChatSessionsByPersona(personaId)

    suspend fun getChatSessionById(id: String): ChatSession? =
        chatSessionDao.getChatSessionById(id)

    suspend fun saveChatSession(chatSession: ChatSession) =
        chatSessionDao.insertChatSession(chatSession)

    suspend fun updateChatSession(chatSession: ChatSession) =
        chatSessionDao.updateChatSession(chatSession)

    suspend fun deleteChatSession(chatSession: ChatSession) =
        chatSessionDao.deleteChatSession(chatSession)

    suspend fun deleteAllChatSessions() = chatSessionDao.deleteAllChatSessions()

    // Settings operations
    fun getUserDetails(): Flow<UserDetails> = settingsDataStore.userDetails

    fun getApiKeys(): Flow<ApiKeys> = settingsDataStore.apiKeys

    suspend fun saveUserDetails(userDetails: UserDetails) =
        settingsDataStore.saveUserDetails(userDetails)

    suspend fun saveApiKeys(apiKeys: ApiKeys) = settingsDataStore.saveApiKeys(apiKeys)

    // Clear all data
    suspend fun clearAllData() {
        chatSessionDao.deleteAllChatSessions()
        personaDao.getAllPersonas().forEach { personaDao.deletePersona(it) }
        settingsDataStore.clearAll()
    }

    // AI operations
    suspend fun chatWithPersona(
        persona: Persona,
        messages: List<ChatMessage>,
        userDetails: UserDetails
    ): String {
        val apiKeys = getApiKeys().first()
        if (apiKeys.gemini.isEmpty()) {
            throw Exception("No API keys configured")
        }

        // Build the prompt similar to web app
        val systemPrompt = buildSystemPrompt(persona, userDetails)
        val contents = mutableListOf<Content>()
        
        // Add system context as first user message
        contents.add(Content(role = "user", parts = listOf(Part(text = systemPrompt))))
        contents.add(Content(role = "model", parts = listOf(Part(text = "I understand. I'll respond as ${persona.name}."))))

        // Add conversation history
        messages.forEach { message ->
            if (!message.isIgnored) {
                contents.add(
                    Content(
                        role = if (message.role == "user") "user" else "model",
                        parts = listOf(Part(text = message.content))
                    )
                )
            }
        }

        val request = GeminiRequest(
            contents = contents,
            generationConfig = GenerationConfig(
                temperature = 0.9,
                maxOutputTokens = 2048,
                topP = 0.95,
                topK = 40
            )
        )

        // Try each API key until one works
        for (apiKey in apiKeys.gemini) {
            try {
                val response = geminiApi.generateContent(apiKey, request)
                val text = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                if (text != null) {
                    return text
                }
            } catch (e: Exception) {
                // Try next key
                continue
            }
        }

        throw Exception("Failed to generate response with all API keys")
    }

    private fun buildSystemPrompt(persona: Persona, userDetails: UserDetails): String {
        return """
You are ${persona.name}, ${persona.relation}.

${if (persona.age != null) "Age: ${persona.age}\n" else ""}
Backstory: ${persona.backstory}

Personality Traits: ${persona.traits}

Goals & Motivations: ${persona.goals}

Response Style: ${persona.responseStyle}

${if (persona.memories.isNotEmpty()) "Important Memories:\n${persona.memories.joinToString("\n")}\n" else ""}

You are chatting with ${if (userDetails.name.isNotBlank()) userDetails.name else "someone"}.
${if (userDetails.about.isNotBlank()) "About them: ${userDetails.about}\n" else ""}

Stay in character at all times. Be natural, engaging, and authentic to your personality.
        """.trimIndent()
    }

    suspend fun generatePersonaFromPrompt(prompt: String): Persona {
        val apiKeys = getApiKeys().first()
        if (apiKeys.gemini.isEmpty()) {
            throw Exception("No API keys configured")
        }

        val systemPrompt = """
Generate a detailed persona based on this prompt: "$prompt"

Return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "name": "character name",
  "relation": "brief relationship description",
  "age": 25,
  "traits": "personality traits",
  "backstory": "detailed backstory",
  "goals": "character goals and motivations",
  "responseStyle": "how they communicate",
  "minWpm": 180,
  "maxWpm": 220
}
        """.trimIndent()

        val request = GeminiRequest(
            contents = listOf(
                Content(role = "user", parts = listOf(Part(text = systemPrompt)))
            ),
            generationConfig = GenerationConfig(temperature = 0.8, maxOutputTokens = 2048)
        )

        for (apiKey in apiKeys.gemini) {
            try {
                val response = geminiApi.generateContent(apiKey, request)
                val text = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                if (text != null) {
                    // Parse JSON and create persona
                    return parsePersonaFromJson(text)
                }
            } catch (e: Exception) {
                continue
            }
        }

        throw Exception("Failed to generate persona")
    }

    private fun parsePersonaFromJson(json: String): Persona {
        val cleanJson = json.trim()
            .removePrefix("```json")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()

        val gson = com.google.gson.Gson()
        val map = gson.fromJson(cleanJson, Map::class.java) as Map<String, Any>

        return Persona(
            id = UUID.randomUUID().toString(),
            name = map["name"] as? String ?: "Unknown",
            relation = map["relation"] as? String ?: "",
            age = (map["age"] as? Double)?.toInt(),
            traits = map["traits"] as? String ?: "",
            backstory = map["backstory"] as? String ?: "",
            goals = map["goals"] as? String ?: "",
            responseStyle = map["responseStyle"] as? String ?: "",
            profilePictureUrl = "", // Will be set by caller
            minWpm = (map["minWpm"] as? Double)?.toInt() ?: 180,
            maxWpm = (map["maxWpm"] as? Double)?.toInt() ?: 220,
            memories = emptyList()
        )
    }
}
