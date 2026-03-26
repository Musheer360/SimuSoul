package com.simusoul.app.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Personas : Screen("personas")
    object PersonaDetail : Screen("persona/{personaId}") {
        fun createRoute(personaId: String) = "persona/$personaId"
    }
    object PersonaNew : Screen("persona/new")
    object Settings : Screen("settings")
    object About : Screen("about")
}
