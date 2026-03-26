package com.simusoul.app.data.local

import androidx.room.*
import com.simusoul.app.data.model.ChatSession
import com.simusoul.app.data.model.Converters
import com.simusoul.app.data.model.Persona

@Dao
interface PersonaDao {
    @Query("SELECT * FROM personas ORDER BY createdAt DESC")
    suspend fun getAllPersonas(): List<Persona>

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
interface ChatSessionDao {
    @Query("SELECT * FROM chat_sessions WHERE personaId = :personaId ORDER BY updatedAt DESC")
    suspend fun getChatSessionsByPersona(personaId: String): List<ChatSession>

    @Query("SELECT * FROM chat_sessions WHERE id = :id")
    suspend fun getChatSessionById(id: String): ChatSession?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChatSession(chatSession: ChatSession)

    @Update
    suspend fun updateChatSession(chatSession: ChatSession)

    @Delete
    suspend fun deleteChatSession(chatSession: ChatSession)

    @Query("DELETE FROM chat_sessions WHERE id = :id")
    suspend fun deleteChatSessionById(id: String)

    @Query("DELETE FROM chat_sessions WHERE personaId = :personaId")
    suspend fun deleteAllChatSessionsByPersona(personaId: String)

    @Query("DELETE FROM chat_sessions")
    suspend fun deleteAllChatSessions()
}

@Database(
    entities = [Persona::class, ChatSession::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class SimuSoulDatabase : RoomDatabase() {
    abstract fun personaDao(): PersonaDao
    abstract fun chatSessionDao(): ChatSessionDao
}
