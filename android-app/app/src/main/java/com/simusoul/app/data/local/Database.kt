package com.simusoul.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.simusoul.app.data.models.ChatSession
import com.simusoul.app.data.models.Persona

@Database(
    entities = [Persona::class, ChatSession::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class SimuSoulDatabase : RoomDatabase() {
    abstract fun personaDao(): PersonaDao
    abstract fun chatDao(): ChatDao

    companion object {
        @Volatile
        private var INSTANCE: SimuSoulDatabase? = null

        fun getDatabase(context: Context): SimuSoulDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SimuSoulDatabase::class.java,
                    "simusoul_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
