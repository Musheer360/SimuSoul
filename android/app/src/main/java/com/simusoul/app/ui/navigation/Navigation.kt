package com.simusoul.app.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.simusoul.app.ui.screens.*

@Composable
fun SimuSoulNavigation(
    navController: NavHostController,
    startDestination: String = Screen.Home.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToPersonas = { navController.navigate(Screen.Personas.route) }
            )
        }

        composable(Screen.Personas.route) {
            PersonasScreen(
                onNavigateToPersona = { personaId ->
                    navController.navigate(Screen.PersonaDetail.createRoute(personaId))
                },
                onNavigateToNew = { navController.navigate(Screen.PersonaNew.route) }
            )
        }

        composable(
            route = Screen.PersonaDetail.route,
            arguments = listOf(navArgument("personaId") { type = NavType.StringType })
        ) { backStackEntry ->
            val personaId = backStackEntry.arguments?.getString("personaId") ?: return@composable
            PersonaDetailScreen(
                personaId = personaId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.PersonaNew.route) {
            PersonaNewScreen(
                onNavigateBack = { navController.popBackStack() },
                onPersonaCreated = { personaId ->
                    navController.popBackStack()
                    navController.navigate(Screen.PersonaDetail.createRoute(personaId))
                }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
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
