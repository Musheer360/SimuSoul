package com.simusoul.app.ui.screens.personas

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.simusoul.app.data.SimuSoulRepository
import com.simusoul.app.data.models.Persona
import com.simusoul.app.ui.components.ConfirmDialog
import com.simusoul.app.ui.components.LoadingIndicator
import com.simusoul.app.ui.components.SiteHeader
import com.simusoul.app.ui.theme.SimuSoulTheme
import kotlinx.coroutines.launch
import androidx.compose.foundation.Image
import coil.compose.AsyncImage

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
                .padding(16.dp)
        ) {
            // Header section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Your Personas",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.foreground
                    )
                    Text(
                        text = "Manage your AI companions or create new ones.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground
                    )
                }
                
                Button(
                    onClick = onNavigateToNewPersona,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.primary,
                        contentColor = colors.primaryForeground
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Create")
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Content
            when {
                personas == null -> {
                    LoadingIndicator()
                }
                personas!!.isEmpty() -> {
                    EmptyPersonasView(onNavigateToNewPersona)
                }
                else -> {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 160.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
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
            title = "Delete Persona?",
            message = "This will permanently delete ${persona.name} and all associated chats. This cannot be undone.",
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
            .aspectRatio(0.7f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = colors.card
        )
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Profile picture
            if (persona.profilePictureUrl.startsWith("data:image")) {
                // Base64 image
                val base64Data = persona.profilePictureUrl
                    .substringAfter("base64,")
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
            } else {
                AsyncImage(
                    model = persona.profilePictureUrl,
                    contentDescription = persona.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
            
            // Delete button
            IconButton(
                onClick = onDelete,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = colors.destructive,
                    modifier = Modifier.size(20.dp)
                )
            }
            
            // Gradient overlay with text
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.7f),
                                Color.Black.copy(alpha = 0.9f)
                            )
                        )
                    )
            )
            
            // Name and relation
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(12.dp)
            ) {
                Text(
                    text = persona.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = persona.relation,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.8f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun EmptyPersonasView(
    onNavigateToNewPersona: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier
                    .size(96.dp),
                shape = RoundedCornerShape(48.dp),
                color = colors.primary.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.SmartToy,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = colors.primary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "Your Collection is Empty",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Medium,
                color = colors.foreground
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "You haven't created any personas yet.\nClick the button above to bring your first character to life.",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.mutedForeground,
                modifier = Modifier.padding(horizontal = 32.dp)
            )
        }
    }
}
