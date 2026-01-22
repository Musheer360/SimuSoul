package com.simusoul.app

import android.app.Application
import androidx.room.Room
import com.simusoul.app.data.local.SimuSoulDatabase
import com.simusoul.app.data.local.SettingsDataStore
import com.simusoul.app.data.remote.GeminiApiClient
import com.simusoul.app.data.repository.SimuSoulRepository

class SimuSoulApplication : Application() {
    lateinit var database: SimuSoulDatabase
        private set
    
    lateinit var repository: SimuSoulRepository
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        database = Room.databaseBuilder(
            applicationContext,
            SimuSoulDatabase::class.java,
            "simusoul_database"
        ).build()
        
        val settingsDataStore = SettingsDataStore(applicationContext)
        val geminiApi = GeminiApiClient.create()
        
        repository = SimuSoulRepository(
            personaDao = database.personaDao(),
            chatSessionDao = database.chatSessionDao(),
            settingsDataStore = settingsDataStore,
            geminiApi = geminiApi
        )
    }
}
