package com.simusoul.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Custom color scheme for SimuSoul
data class SimuSoulColors(
    val background: Color,
    val foreground: Color,
    val card: Color,
    val cardForeground: Color,
    val primary: Color,
    val primaryForeground: Color,
    val secondary: Color,
    val secondaryForeground: Color,
    val muted: Color,
    val mutedForeground: Color,
    val accent: Color,
    val accentForeground: Color,
    val destructive: Color,
    val destructiveForeground: Color,
    val border: Color,
    val input: Color
)

val LightSimuSoulColors = SimuSoulColors(
    background = LightBackground,
    foreground = LightForeground,
    card = LightCard,
    cardForeground = LightCardForeground,
    primary = LightPrimary,
    primaryForeground = LightPrimaryForeground,
    secondary = LightSecondary,
    secondaryForeground = LightSecondaryForeground,
    muted = LightMuted,
    mutedForeground = LightMutedForeground,
    accent = LightAccent,
    accentForeground = LightAccentForeground,
    destructive = LightDestructive,
    destructiveForeground = LightDestructiveForeground,
    border = LightBorder,
    input = LightInput
)

val DarkSimuSoulColors = SimuSoulColors(
    background = DarkBackground,
    foreground = DarkForeground,
    card = DarkCard,
    cardForeground = DarkCardForeground,
    primary = DarkPrimary,
    primaryForeground = DarkPrimaryForeground,
    secondary = DarkSecondary,
    secondaryForeground = DarkSecondaryForeground,
    muted = DarkMuted,
    mutedForeground = DarkMutedForeground,
    accent = DarkAccent,
    accentForeground = DarkAccentForeground,
    destructive = DarkDestructive,
    destructiveForeground = DarkDestructiveForeground,
    border = DarkBorder,
    input = DarkInput
)

val LocalSimuSoulColors = staticCompositionLocalOf { DarkSimuSoulColors }

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = DarkPrimaryForeground,
    secondary = DarkSecondary,
    onSecondary = DarkSecondaryForeground,
    tertiary = DarkAccent,
    onTertiary = DarkAccentForeground,
    background = DarkBackground,
    onBackground = DarkForeground,
    surface = DarkCard,
    onSurface = DarkCardForeground,
    error = DarkDestructive,
    onError = DarkDestructiveForeground,
    outline = DarkBorder
)

private val LightColorScheme = lightColorScheme(
    primary = LightPrimary,
    onPrimary = LightPrimaryForeground,
    secondary = LightSecondary,
    onSecondary = LightSecondaryForeground,
    tertiary = LightAccent,
    onTertiary = LightAccentForeground,
    background = LightBackground,
    onBackground = LightForeground,
    surface = LightCard,
    onSurface = LightCardForeground,
    error = LightDestructive,
    onError = LightDestructiveForeground,
    outline = LightBorder
)

@Composable
fun SimuSoulTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val simuSoulColors = if (darkTheme) DarkSimuSoulColors else LightSimuSoulColors

    CompositionLocalProvider(LocalSimuSoulColors provides simuSoulColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}

object SimuSoulTheme {
    val colors: SimuSoulColors
        @Composable
        get() = LocalSimuSoulColors.current
}
