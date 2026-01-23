package com.simusoul.app.navigation

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Personas : Screen("personas")
    data object NewPersona : Screen("persona/new")
    data object Settings : Screen("settings")
    data object About : Screen("about")
    
    data object PersonaChat : Screen("persona/{personaId}") {
        fun createRoute(personaId: String) = "persona/$personaId"
    }
}
