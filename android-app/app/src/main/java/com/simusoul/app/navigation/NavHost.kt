package com.simusoul.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.ui.screens.about.AboutScreen
import com.simusoul.app.ui.screens.chat.ChatScreen
import com.simusoul.app.ui.screens.home.HomeScreen
import com.simusoul.app.ui.screens.persona.NewPersonaScreen
import com.simusoul.app.ui.screens.personas.PersonasScreen
import com.simusoul.app.ui.screens.settings.SettingsScreen

@Composable
fun SimuSoulNavHost(
    navController: NavHostController,
    repository: SimuSoulRepository,
    isDarkTheme: Boolean,
    onThemeToggle: () -> Unit
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                repository = repository,
                onNavigateToPersonas = {
                    navController.navigate(Screen.Personas.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToAbout = {
                    navController.navigate(Screen.About.route)
                },
                isDarkTheme = isDarkTheme,
                onThemeToggle = onThemeToggle
            )
        }
        
        composable(Screen.Personas.route) {
            PersonasScreen(
                repository = repository,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToNewPersona = {
                    navController.navigate(Screen.NewPersona.route)
                },
                onNavigateToChat = { personaId ->
                    navController.navigate(Screen.PersonaChat.createRoute(personaId))
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToAbout = {
                    navController.navigate(Screen.About.route)
                },
                isDarkTheme = isDarkTheme,
                onThemeToggle = onThemeToggle
            )
        }
        
        composable(Screen.NewPersona.route) {
            NewPersonaScreen(
                repository = repository,
                onNavigateBack = { navController.popBackStack() },
                onPersonaCreated = { personaId ->
                    navController.navigate(Screen.PersonaChat.createRoute(personaId)) {
                        popUpTo(Screen.Personas.route)
                    }
                }
            )
        }
        
        composable(
            route = Screen.PersonaChat.route,
            arguments = listOf(
                navArgument("personaId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val personaId = backStackEntry.arguments?.getString("personaId") ?: return@composable
            ChatScreen(
                personaId = personaId,
                repository = repository,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToPersonas = {
                    navController.navigate(Screen.Personas.route) {
                        popUpTo(Screen.Home.route)
                    }
                }
            )
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(
                repository = repository,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.About.route) {
            AboutScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
