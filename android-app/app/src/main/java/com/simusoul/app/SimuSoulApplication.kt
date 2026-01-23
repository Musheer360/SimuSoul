package com.simusoul.app

import android.app.Application
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.local.PreferencesManager
import com.simusoul.app.data.local.SimuSoulDatabase
import com.simusoul.app.data.remote.GeminiApiClient

class SimuSoulApplication : Application() {
    
    lateinit var repository: SimuSoulRepository
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        val database = SimuSoulDatabase.getDatabase(this)
        val preferencesManager = PreferencesManager(this)
        val geminiApiClient = GeminiApiClient()
        
        repository = SimuSoulRepository(
            personaDao = database.personaDao(),
            chatDao = database.chatDao(),
            preferencesManager = preferencesManager,
            geminiApiClient = geminiApiClient
        )
    }
}
