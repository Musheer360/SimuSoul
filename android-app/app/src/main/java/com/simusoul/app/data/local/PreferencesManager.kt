package com.simusoul.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.simusoul.app.data.models.ApiKeys
import com.simusoul.app.data.models.UserDetails
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "simusoul_prefs")

class PreferencesManager(private val context: Context) {
    
    private object Keys {
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_ABOUT = stringPreferencesKey("user_about")
        val HAS_ACCEPTED_TERMS = booleanPreferencesKey("has_accepted_terms")
        val GEMINI_API_KEYS = stringPreferencesKey("gemini_api_keys")
        val THEME_MODE = stringPreferencesKey("theme_mode")
    }

    val userDetails: Flow<UserDetails> = context.dataStore.data.map { prefs ->
        UserDetails(
            name = prefs[Keys.USER_NAME] ?: "",
            about = prefs[Keys.USER_ABOUT] ?: "",
            hasAcceptedTerms = prefs[Keys.HAS_ACCEPTED_TERMS] ?: false
        )
    }

    suspend fun getUserDetails(): UserDetails {
        return userDetails.first()
    }

    suspend fun saveUserDetails(userDetails: UserDetails) {
        context.dataStore.edit { prefs ->
            prefs[Keys.USER_NAME] = userDetails.name
            prefs[Keys.USER_ABOUT] = userDetails.about
            prefs[Keys.HAS_ACCEPTED_TERMS] = userDetails.hasAcceptedTerms
        }
    }

    val apiKeys: Flow<ApiKeys> = context.dataStore.data.map { prefs ->
        val keysString = prefs[Keys.GEMINI_API_KEYS] ?: ""
        ApiKeys(
            gemini = if (keysString.isEmpty()) emptyList() else keysString.split(",").filter { it.isNotBlank() }
        )
    }

    suspend fun getApiKeys(): ApiKeys {
        return apiKeys.first()
    }

    suspend fun saveApiKeys(apiKeys: ApiKeys) {
        context.dataStore.edit { prefs ->
            prefs[Keys.GEMINI_API_KEYS] = apiKeys.gemini.joinToString(",")
        }
    }

    val themeMode: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.THEME_MODE] ?: "dark"
    }

    suspend fun setThemeMode(mode: String) {
        context.dataStore.edit { prefs ->
            prefs[Keys.THEME_MODE] = mode
        }
    }

    suspend fun clearAllData() {
        context.dataStore.edit { it.clear() }
    }
}
