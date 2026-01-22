package com.simusoul.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

@Entity(tableName = "personas")
data class Persona(
    @PrimaryKey
    val id: String,
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
    val memories: List<String> = emptyList(),
    val lastChatTime: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "chat_sessions")
data class ChatSession(
    @PrimaryKey
    val id: String,
    val personaId: String,
    val title: String,
    val messages: List<ChatMessage> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val summary: String? = null,
    val lastSummarizedAtMessageCount: Int? = null
)

data class ChatMessage(
    val role: String, // "user" or "assistant"
    val content: String,
    val isIgnored: Boolean = false,
    val attachments: List<FileAttachment> = emptyList()
)

data class FileAttachment(
    val mimeType: String,
    val data: String, // base64 encoded
    val name: String
)

data class UserDetails(
    val name: String = "",
    val about: String = "",
    val hasAcceptedTerms: Boolean = false
)

data class ApiKeys(
    val gemini: List<String> = emptyList()
)

// Type converters for Room
class Converters {
    private val gson = Gson()

    @TypeConverter
    fun fromStringList(value: List<String>): String {
        return gson.toJson(value)
    }

    @TypeConverter
    fun toStringList(value: String): List<String> {
        val listType = object : TypeToken<List<String>>() {}.type
        return gson.fromJson(value, listType)
    }

    @TypeConverter
    fun fromChatMessageList(value: List<ChatMessage>): String {
        return gson.toJson(value)
    }

    @TypeConverter
    fun toChatMessageList(value: String): List<ChatMessage> {
        val listType = object : TypeToken<List<ChatMessage>>() {}.type
        return gson.fromJson(value, listType)
    }
}
