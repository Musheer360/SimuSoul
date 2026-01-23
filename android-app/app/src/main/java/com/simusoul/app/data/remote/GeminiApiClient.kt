package com.simusoul.app.data.remote

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import com.simusoul.app.data.models.ApiKeys
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class GeminiApiClient {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val userKeyIndex = AtomicInteger(0)

    companion object {
        private const val GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/"
        private const val TEST_MODE_SUFFIX = "_TEST_MODE_360"
    }

    fun isTestModeActive(apiKeys: ApiKeys): Boolean {
        val validKeys = apiKeys.gemini.filter { it.isNotBlank() }
        if (validKeys.isEmpty()) return false
        return validKeys.all { it.endsWith(TEST_MODE_SUFFIX) }
    }

    private fun getRoundRobinUserKey(customKeys: List<String>): String {
        if (customKeys.isEmpty()) throw Exception("No API keys available")
        val index = userKeyIndex.getAndUpdate { (it + 1) % customKeys.size }
        return customKeys[index].replace(TEST_MODE_SUFFIX, "")
    }

    suspend fun callGeminiApi(
        model: String,
        body: Map<String, Any>,
        apiKeys: ApiKeys
    ): GeminiResponse = withContext(Dispatchers.IO) {
        val validKeys = apiKeys.gemini.filter { it.isNotBlank() }
        
        if (validKeys.isEmpty()) {
            throw Exception("No API key provided. Please add your Gemini API key in the settings page to use the application.")
        }

        var lastError: Exception? = null
        val attempts = validKeys.size

        for (i in 0 until attempts) {
            val keyToTry = getRoundRobinUserKey(validKeys)
            val url = "$GEMINI_API_URL$model?key=$keyToTry"

            val maxApiRetries = 3
            for (retry in 0 until maxApiRetries) {
                try {
                    val jsonBody = gson.toJson(body)
                    val requestBody = jsonBody.toRequestBody("application/json".toMediaType())

                    val request = Request.Builder()
                        .url(url)
                        .post(requestBody)
                        .addHeader("Content-Type", "application/json")
                        .build()

                    val response = client.newCall(request).execute()
                    
                    if (!response.isSuccessful) {
                        val errorBody = response.body?.string() ?: ""
                        val errorMsg = "API Error (${response.code}): $errorBody"
                        
                        // Retry on 503 with exponential backoff
                        if (response.code == 503 && retry < maxApiRetries - 1) {
                            delay((1L shl retry) * 1000)
                            continue
                        }
                        
                        throw Exception(errorMsg)
                    }

                    val responseBody = response.body?.string() ?: throw Exception("Empty response")
                    return@withContext gson.fromJson(responseBody, GeminiResponse::class.java)
                    
                } catch (e: Exception) {
                    if (retry == maxApiRetries - 1 || !e.message.orEmpty().contains("503")) {
                        lastError = e
                        break
                    }
                }
            }
        }
        
        throw Exception("All provided API keys failed. Last error: ${lastError?.message ?: "Unknown error"}")
    }
}

data class GeminiResponse(
    val candidates: List<Candidate>? = null
)

data class Candidate(
    val content: Content? = null
)

data class Content(
    val parts: List<Part>? = null
)

data class Part(
    val text: String? = null
)

// Chat response schemas
data class ChatWithPersonaOutput(
    val response: List<String> = emptyList(),
    val newMemories: List<String>? = null,
    val removedMemories: List<String>? = null,
    val shouldIgnore: Boolean? = null,
    val ignoreReason: String? = null
)

data class GenerateTitleOutput(
    val title: String = ""
)

data class SummarizeChatOutput(
    val summary: String = ""
)

data class GeneratePersonaOutput(
    val name: String = "",
    val relation: String = "",
    val age: Int? = null,
    val traits: String = "",
    val backstory: String = "",
    val goals: String = "",
    val responseStyle: String = "",
    val minWpm: Int = 40,
    val maxWpm: Int = 80
)

data class ModerationOutput(
    val isSafe: Boolean = true,
    val reason: String? = null
)

data class GenerateDetailsOutput(
    val traits: String = "",
    val backstory: String = "",
    val goals: String = "",
    val responseStyle: String = "",
    val age: Int? = null
)
