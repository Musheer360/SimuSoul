package com.simusoul.app.data.local

import androidx.room.*
import com.simusoul.app.data.models.ChatSession
import com.simusoul.app.data.models.Persona
import kotlinx.coroutines.flow.Flow

@Dao
interface PersonaDao {
    @Query("SELECT * FROM personas")
    fun getAllPersonas(): Flow<List<Persona>>

    @Query("SELECT * FROM personas")
    suspend fun getAllPersonasOnce(): List<Persona>

    @Query("SELECT * FROM personas WHERE id = :id")
    suspend fun getPersonaById(id: String): Persona?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPersona(persona: Persona)

    @Update
    suspend fun updatePersona(persona: Persona)

    @Delete
    suspend fun deletePersona(persona: Persona)

    @Query("DELETE FROM personas WHERE id = :id")
    suspend fun deletePersonaById(id: String)
}

@Dao
interface ChatDao {
    @Query("SELECT * FROM chats WHERE personaId = :personaId ORDER BY updatedAt DESC")
    fun getChatsByPersonaId(personaId: String): Flow<List<ChatSession>>

    @Query("SELECT * FROM chats WHERE personaId = :personaId ORDER BY updatedAt DESC")
    suspend fun getChatsByPersonaIdOnce(personaId: String): List<ChatSession>

    @Query("SELECT * FROM chats WHERE id = :id")
    suspend fun getChatById(id: String): ChatSession?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChat(chat: ChatSession)

    @Update
    suspend fun updateChat(chat: ChatSession)

    @Delete
    suspend fun deleteChat(chat: ChatSession)

    @Query("DELETE FROM chats WHERE id = :id")
    suspend fun deleteChatById(id: String)

    @Query("DELETE FROM chats WHERE personaId = :personaId")
    suspend fun deleteAllChatsByPersonaId(personaId: String)
}
