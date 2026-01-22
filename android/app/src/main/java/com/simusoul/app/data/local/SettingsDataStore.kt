package com.simusoul.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.simusoul.app.data.model.ApiKeys
import com.simusoul.app.data.model.UserDetails
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsDataStore(private val context: Context) {
    private val gson = Gson()

    companion object {
        private val USER_NAME = stringPreferencesKey("user_name")
        private val USER_ABOUT = stringPreferencesKey("user_about")
        private val HAS_ACCEPTED_TERMS = booleanPreferencesKey("has_accepted_terms")
        private val API_KEYS = stringPreferencesKey("api_keys")
    }

    val userDetails: Flow<UserDetails> = context.dataStore.data.map { preferences ->
        UserDetails(
            name = preferences[USER_NAME] ?: "",
            about = preferences[USER_ABOUT] ?: "",
            hasAcceptedTerms = preferences[HAS_ACCEPTED_TERMS] ?: false
        )
    }

    val apiKeys: Flow<ApiKeys> = context.dataStore.data.map { preferences ->
        val keysJson = preferences[API_KEYS] ?: "{\"gemini\":[]}"
        gson.fromJson(keysJson, ApiKeys::class.java)
    }

    suspend fun saveUserDetails(userDetails: UserDetails) {
        context.dataStore.edit { preferences ->
            preferences[USER_NAME] = userDetails.name
            preferences[USER_ABOUT] = userDetails.about
            preferences[HAS_ACCEPTED_TERMS] = userDetails.hasAcceptedTerms
        }
    }

    suspend fun saveApiKeys(apiKeys: ApiKeys) {
        context.dataStore.edit { preferences ->
            preferences[API_KEYS] = gson.toJson(apiKeys)
        }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
