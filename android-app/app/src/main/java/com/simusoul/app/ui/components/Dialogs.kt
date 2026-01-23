package com.simusoul.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.simusoul.app.ui.theme.SimuSoulTheme

@Composable
fun TermsDialog(
    onAccept: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
    
    Dialog(
        onDismissRequest = { /* Cannot dismiss without accepting */ },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = colors.card
            )
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Welcome to SimuSoul!",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = colors.foreground
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Before you begin, please review our terms and guidelines.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.mutedForeground,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(280.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = colors.secondary
                ) {
                    Column(
                        modifier = Modifier
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "Privacy Policy",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.foreground
                        )
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = "• Local Data Storage: All data is stored locally on your device.\n\n" +
                                   "• AI Interaction: Conversations are sent to Google Gemini API.\n\n" +
                                   "• Sensitive Information: Do not enter personal sensitive data.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.mutedForeground
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Text(
                            text = "Guidelines",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.foreground
                        )
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = "• You are responsible for content you create.\n" +
                                   "• AI content is for entertainment only.\n" +
                                   "• Use at your own risk.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.mutedForeground
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "© $currentYear Musheer Alam. All Rights Reserved.",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.mutedForeground
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = onAccept,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.primary,
                        contentColor = colors.primaryForeground
                    )
                ) {
                    Text("Acknowledge & Continue")
                }
            }
        }
    }
}

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String = "Confirm",
    cancelText: String = "Cancel",
    isDestructive: Boolean = false,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    val colors = SimuSoulTheme.colors
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = title,
                color = colors.foreground
            )
        },
        text = {
            Text(
                text = message,
                color = colors.mutedForeground
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isDestructive) colors.destructive else colors.primary,
                    contentColor = if (isDestructive) colors.destructiveForeground else colors.primaryForeground
                )
            ) {
                Text(confirmText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(cancelText, color = colors.mutedForeground)
            }
        },
        containerColor = colors.card
    )
}
