package com.simusoul.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simusoul.app.ui.theme.SimuSoulTheme
import com.simusoul.app.ui.theme.GradientCyan

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SiteHeader(
    onNavigateToSettings: () -> Unit,
    onNavigateToAbout: () -> Unit,
    isDarkTheme: Boolean,
    onThemeToggle: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.background,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "SimuSoul",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = colors.primary
            )
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                IconButton(
                    onClick = onNavigateToAbout,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = colors.secondary
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "About",
                        tint = colors.foreground
                    )
                }
                
                IconButton(
                    onClick = onThemeToggle,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = colors.secondary
                    )
                ) {
                    Icon(
                        imageVector = if (isDarkTheme) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                        contentDescription = "Toggle theme",
                        tint = colors.foreground
                    )
                }
                
                IconButton(
                    onClick = onNavigateToSettings,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = colors.secondary
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings",
                        tint = colors.foreground
                    )
                }
            }
        }
    }
}

@Composable
fun AnimatedGradientText(
    text: String,
    modifier: Modifier = Modifier
) {
    val colors = SimuSoulTheme.colors
    val infiniteTransition = rememberInfiniteTransition(label = "gradient")
    
    val offset = infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(6000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "gradientOffset"
    )
    
    val gradientColors = listOf(
        colors.primary,
        GradientCyan,
        colors.foreground,
        GradientCyan,
        colors.primary
    )
    
    Text(
        text = text,
        modifier = modifier,
        style = MaterialTheme.typography.displaySmall.copy(
            fontWeight = FontWeight.Bold,
            brush = Brush.horizontalGradient(
                colors = gradientColors,
                startX = offset.value * 1000f,
                endX = offset.value * 1000f + 500f
            )
        )
    )
}

@Composable
fun LoadingIndicator(
    modifier: Modifier = Modifier
) {
    val colors = SimuSoulTheme.colors
    
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            color = colors.primary
        )
    }
}

@Composable
fun TypingIndicator(
    modifier: Modifier = Modifier
) {
    val colors = SimuSoulTheme.colors
    val infiniteTransition = rememberInfiniteTransition(label = "typing")
    
    val dot1Alpha = infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 1000
                0.3f at 0
                1f at 333
                0.3f at 666
            }
        ),
        label = "dot1"
    )
    
    val dot2Alpha = infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 1000
                0.3f at 0
                0.3f at 333
                1f at 666
                0.3f at 1000
            }
        ),
        label = "dot2"
    )
    
    val dot3Alpha = infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 1000
                0.3f at 0
                0.3f at 666
                1f at 1000
            }
        ),
        label = "dot3"
    )
    
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(colors.secondary)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(50))
                .background(colors.mutedForeground.copy(alpha = dot1Alpha.value))
        )
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(50))
                .background(colors.mutedForeground.copy(alpha = dot2Alpha.value))
        )
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(50))
                .background(colors.mutedForeground.copy(alpha = dot3Alpha.value))
        )
    }
}

@Composable
fun SkeletonLoader(
    modifier: Modifier = Modifier
) {
    val colors = SimuSoulTheme.colors
    val infiniteTransition = rememberInfiniteTransition(label = "skeleton")
    
    val alpha = infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "skeletonAlpha"
    )
    
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(colors.muted.copy(alpha = alpha.value))
    )
}
