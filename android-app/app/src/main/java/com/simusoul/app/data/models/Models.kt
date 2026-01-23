package com.simusoul.app.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Represents a file attachment in a chat message.
 * Files are stored as base64-encoded data with their MIME type.
 */
data class FileAttachment(
    val mimeType: String,
    val data: String,
    val name: String
)

/**
 * Represents a single chat message
 */
data class ChatMessage(
    val role: String, // "user" or "assistant"
    val content: String,
    val isIgnored: Boolean = false,
    val attachments: List<FileAttachment>? = null
)

/**
 * Represents a chat session with messages
 */
@Entity(tableName = "chats")
data class ChatSession(
    @PrimaryKey val id: String,
    val personaId: String,
    val title: String,
    val messages: List<ChatMessage>,
    val createdAt: Long,
    val updatedAt: Long,
    val summary: String? = null,
    val lastSummarizedAtMessageCount: Int? = null
)

/**
 * Lightweight chat header for sidebar display.
 * Does not include the full messages array.
 */
data class ChatSessionHeader(
    val id: String,
    val personaId: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val summary: String? = null,
    val lastSummarizedAtMessageCount: Int? = null
)

/**
 * Represents persona's ignored state
 */
data class IgnoredState(
    val isIgnored: Boolean,
    val reason: String? = null,
    val chatId: String? = null
)

/**
 * Represents an AI persona
 */
@Entity(tableName = "personas")
data class Persona(
    @PrimaryKey val id: String,
    val name: String,
    val relation: String,
    val age: Int? = null,
    val backstory: String,
    val traits: String,
    val goals: String,
    val responseStyle: String,
    val profilePictureUrl: String,
    val minWpm: Int,
    val maxWpm: Int,
    val memories: List<String>,
    val lastChatTime: Long? = null,
    val ignoredState: IgnoredState? = null
)

/**
 * Represents user details
 */
data class UserDetails(
    val name: String = "",
    val about: String = "",
    val hasAcceptedTerms: Boolean = false
)

/**
 * Represents API keys
 */
data class ApiKeys(
    val gemini: List<String> = emptyList()
)
