package com.simusoul.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.simusoul.app.ui.theme.AccentBlue

@Composable
fun HomeScreen(onNavigateToPersonas: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            // Animated gradient text
            val infiniteTransition = rememberInfiniteTransition(label = "gradient")
            val offset by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(6000, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "offset"
            )
            
            Text(
                text = "Create, Converse, Connect.",
                style = MaterialTheme.typography.displaySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.drawWithContent {
                    drawContent()
                    val colors = listOf(
                        MaterialTheme.colorScheme.primary,
                        AccentBlue,
                        MaterialTheme.colorScheme.onBackground,
                        AccentBlue,
                        MaterialTheme.colorScheme.primary
                    )
                    val brush = Brush.linearGradient(
                        colors = colors,
                        start = Offset(size.width * offset, 0f),
                        end = Offset(size.width * (offset + 0.3f), size.height)
                    )
                    drawRect(brush = brush, blendMode = androidx.compose.ui.graphics.BlendMode.SrcAtop)
                }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Craft unique AI personas and engage in dynamic, memorable conversations. Your imagination is the only limit.",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = onNavigateToPersonas,
                modifier = Modifier
                    .height(56.dp)
                    .padding(horizontal = 32.dp),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Icon(Icons.Default.ArrowForward, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Get Started", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}
