package com.simusoul.app.ui.screens.personas

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.models.Persona
import com.simusoul.app.ui.components.ConfirmDialog
import com.simusoul.app.ui.components.LoadingIndicator
import com.simusoul.app.ui.components.SiteHeader
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.launch

@Composable
fun PersonasScreen(
    repository: SimuSoulRepository,
    onNavigateBack: () -> Unit,
    onNavigateToNewPersona: () -> Unit,
    onNavigateToChat: (String) -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToAbout: () -> Unit,
    isDarkTheme: Boolean,
    onThemeToggle: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    val scope = rememberCoroutineScope()
    
    val personas by repository.getAllPersonas().collectAsState(initial = null)
    var personaToDelete by remember { mutableStateOf<Persona?>(null) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .statusBarsPadding()
    ) {
        SiteHeader(
            onNavigateToSettings = onNavigateToSettings,
            onNavigateToAbout = onNavigateToAbout,
            isDarkTheme = isDarkTheme,
            onThemeToggle = onThemeToggle
        )
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 24.dp)
        ) {
            // Header section matching web app
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Your Personas",
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = (-0.5).sp
                            ),
                            color = colors.foreground
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Manage your AI companions or create new ones.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.mutedForeground
                        )
                    }
                    
                    Spacer(modifier = Modifier.width(16.dp))
                    
                    Button(
                        onClick = onNavigateToNewPersona,
                        modifier = Modifier.height(44.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.primary,
                            contentColor = colors.primaryForeground
                        ),
                        contentPadding = PaddingValues(horizontal = 16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Create New Persona",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Content
            when {
                personas == null -> {
                    LoadingIndicator()
                }
                personas!!.isEmpty() -> {
                    EmptyPersonasView()
                }
                else -> {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 280.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(personas!!) { persona ->
                            PersonaCard(
                                persona = persona,
                                onClick = { onNavigateToChat(persona.id) },
                                onDelete = { personaToDelete = persona }
                            )
                        }
                    }
                }
            }
        }
    }
    
    // Delete confirmation dialog
    personaToDelete?.let { persona ->
        ConfirmDialog(
            title = "Are you absolutely sure?",
            message = "This action cannot be undone. This will permanently delete the persona \"${persona.name}\".",
            confirmText = "Delete",
            isDestructive = true,
            onConfirm = {
                scope.launch {
                    repository.deletePersona(persona.id)
                    personaToDelete = null
                }
            },
            onDismiss = { personaToDelete = null }
        )
    }
}

@Composable
private fun PersonaCard(
    persona: Persona,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(320.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(
                width = 1.dp,
                color = colors.border.copy(alpha = 0.2f),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = colors.card.copy(alpha = 0.8f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Profile picture
            if (persona.profilePictureUrl.startsWith("data:image")) {
                val base64Data = persona.profilePictureUrl.substringAfter("base64,")
                try {
                    val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    bitmap?.let {
                        Image(
                            bitmap = it.asImageBitmap(),
                            contentDescription = persona.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                } catch (e: Exception) {
                    // Handle SVG or invalid base64 - show placeholder
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(colors.secondary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = persona.name.take(2).uppercase(),
                            style = MaterialTheme.typography.displayLarge,
                            color = colors.mutedForeground
                        )
                    }
                }
            } else {
                AsyncImage(
                    model = persona.profilePictureUrl,
                    contentDescription = persona.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
            
            // Delete button - always visible
            IconButton(
                onClick = onDelete,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp)
                    .size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete ${persona.name}",
                    tint = colors.destructive,
                    modifier = Modifier.size(20.dp)
                )
            }
            
            // Gradient overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.6f),
                                Color.Black.copy(alpha = 0.9f)
                            )
                        )
                    )
            )
            
            // Name and relation
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp)
            ) {
                Text(
                    text = persona.name,
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 20.sp
                    ),
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = persona.relation,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.8f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun EmptyPersonasView() {
    val colors = SimuSoulTheme.colors
    
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.SmartToy,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = colors.primary
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "Your Collection is Empty",
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Medium
                ),
                color = colors.foreground,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "You haven't created any personas yet.\nClick the button above to bring your first character to life.",
                style = MaterialTheme.typography.bodyLarge,
                color = colors.mutedForeground,
                textAlign = TextAlign.Center,
                modifier = Modifier.widthIn(max = 350.dp)
            )
        }
    }
}
