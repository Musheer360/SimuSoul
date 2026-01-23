package com.simusoul.app.data.local

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.simusoul.app.data.models.ChatMessage
import com.simusoul.app.data.models.IgnoredState

class Converters {
    private val gson = Gson()

    @TypeConverter
    fun fromStringList(value: List<String>?): String {
        return gson.toJson(value ?: emptyList<String>())
    }

    @TypeConverter
    fun toStringList(value: String): List<String> {
        val type = object : TypeToken<List<String>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromChatMessageList(value: List<ChatMessage>?): String {
        return gson.toJson(value ?: emptyList<ChatMessage>())
    }

    @TypeConverter
    fun toChatMessageList(value: String): List<ChatMessage> {
        val type = object : TypeToken<List<ChatMessage>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromIgnoredState(value: IgnoredState?): String? {
        return if (value == null) null else gson.toJson(value)
    }

    @TypeConverter
    fun toIgnoredState(value: String?): IgnoredState? {
        return if (value == null) null else gson.fromJson(value, IgnoredState::class.java)
    }
}
