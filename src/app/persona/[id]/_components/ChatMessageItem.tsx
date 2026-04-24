import { memo } from 'react';
import { cn } from '@/lib/utils';
import { FormattedMessage } from '@/components/formatted-message';
import { SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, SUPPORTED_AUDIO_TYPES } from '@/lib/constants';
import type { ChatMessage } from '@/lib/types';
import { Film, FileText, Music } from 'lucide-react';

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isFirstInSequence,
  isLastInSequence,
  glowing,
  isLatestUserMessage,
  messageIndex,
  onMessageClick,
  onMediaClick,
  showIgnoredStatus,
}: {
  message: ChatMessage;
  isFirstInSequence: boolean;
  isLastInSequence: boolean;
  glowing: boolean;
  isLatestUserMessage: boolean;
  messageIndex: number;
  onMessageClick: (index: number) => void;
  onMediaClick: (src: string, alt: string, mimeType: string) => void;
  showIgnoredStatus: boolean;
}) {
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasTextContent = message.content.trim().length > 0;

  // Block context menu (right-click) and long-press on media
  const handleMediaContextMenu = (e: React.MouseEvent | Event) => {
    e.preventDefault();
    return false;
  };

  // Helper function to get media corner styling based on message sequence and text content
  const getMediaCornerStyles = () => {
    if (message.role === 'assistant') {
      // Left-aligned messages: adjust top-left and bottom-left corners
      if (isFirstInSequence && isLastInSequence) return "rounded-tl-none";
      if (isFirstInSequence || !isLastInSequence) return "rounded-tl-none rounded-bl-none";
      return "rounded-tl-none rounded-bl-lg";
    }
    // User messages (right-aligned): adjust top-right and bottom-right corners
    // If there's text content below the media, bottom-right should be pointy to connect with text bubble
    if (hasTextContent) {
      return "rounded-tr-none rounded-br-none";
    }
    // No text content below - use standard sequence-based styling
    if (isFirstInSequence && isLastInSequence) return "rounded-tr-none";
    if (isFirstInSequence || !isLastInSequence) return "rounded-tr-none rounded-br-none";
    return "rounded-tr-none rounded-br-lg";
  };
  
  return (
    <div
      className={cn(
        "flex flex-col",
        message.role === 'user' ? 'items-end' : 'items-start',
        isFirstInSequence ? 'mt-4' : 'mt-1'
      )}
    >
      {/* Attachment previews */}
      {hasAttachments && (
        <div className={cn(
          "flex flex-wrap gap-2 max-w-[85%]",
          message.role === 'user' ? 'justify-end' : 'justify-start',
          hasTextContent && 'mb-1'
        )}>
          {message.attachments!.map((attachment, index) => {
            const isImage = SUPPORTED_IMAGE_TYPES.includes(attachment.mimeType);
            const isVideo = SUPPORTED_VIDEO_TYPES.includes(attachment.mimeType);
            const isAudio = SUPPORTED_AUDIO_TYPES.includes(attachment.mimeType);
            const mediaSrc = `data:${attachment.mimeType};base64,${attachment.data}`;
            
            if (isImage) {
              return (
                <div
                  key={index}
                  className={cn(
                    "relative rounded-lg overflow-hidden max-w-[200px] cursor-pointer",
                    getMediaCornerStyles(),
                  )}
                  onClick={() => onMediaClick(mediaSrc, attachment.name, attachment.mimeType)}
                  onContextMenu={handleMediaContextMenu}
                  onTouchStart={(e) => {
                    // Prevent touch-hold context menu on mobile
                    e.currentTarget.addEventListener('contextmenu', handleMediaContextMenu, { once: true });
                  }}
                >
                  <img
                    src={mediaSrc}
                    alt={attachment.name}
                    className={cn(
                      "max-h-[200px] w-auto object-contain rounded-lg select-none pointer-events-none",
                      getMediaCornerStyles(),
                    )}
                    draggable={false}
                  />
                </div>
              );
            }
            
            if (isVideo) {
              return (
                <div
                  key={index}
                  className={cn(
                    "relative rounded-lg overflow-hidden max-w-[250px] cursor-pointer group",
                    getMediaCornerStyles(),
                  )}
                  onClick={() => onMediaClick(mediaSrc, attachment.name, attachment.mimeType)}
                  onContextMenu={handleMediaContextMenu}
                  onTouchStart={(e) => {
                    e.currentTarget.addEventListener('contextmenu', handleMediaContextMenu, { once: true });
                  }}
                >
                  <video
                    src={mediaSrc}
                    className={cn(
                      "max-h-[200px] w-auto rounded-lg select-none pointer-events-none",
                      getMediaCornerStyles(),
                    )}
                    muted
                    playsInline
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Film className="h-6 w-6 text-black ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            }

            if (isAudio) {
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity",
                    message.role === 'user' 
                      ? 'bg-primary/80 text-primary-foreground' 
                      : 'bg-secondary/80'
                  )}
                  onClick={() => onMediaClick(mediaSrc, attachment.name, attachment.mimeType)}
                  onContextMenu={handleMediaContextMenu}
                >
                  <Music className="h-4 w-4" />
                  <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
                </div>
              );
            }
            
            // For document files, show a file indicator with click to preview
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity",
                  message.role === 'user' 
                    ? 'bg-primary/80 text-primary-foreground' 
                    : 'bg-secondary/80'
                )}
                onClick={() => onMediaClick(mediaSrc, attachment.name, attachment.mimeType)}
                onContextMenu={handleMediaContextMenu}
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Only show text bubble if there's actual text content */}
      {hasTextContent && (
        <div 
          className={cn(
            "max-w-[85%] rounded-lg px-4 py-2.5 min-w-0 flex items-center overflow-hidden",
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary',
            glowing && 'animate-shine-once',
            message.role === 'user' && !isLatestUserMessage && 'cursor-pointer',
            message.role === 'assistant' && cn(
              isFirstInSequence && !isLastInSequence && "rounded-tl-none rounded-bl-none",
              isFirstInSequence && isLastInSequence && "rounded-tl-none",
              !isFirstInSequence && !isLastInSequence && "rounded-tl-none rounded-bl-none",
              !isFirstInSequence && isLastInSequence && "rounded-tl-none rounded-bl-lg",
            ),
            message.role === 'user' && cn(
              isFirstInSequence && !isLastInSequence && "rounded-tr-none rounded-br-none",
              isFirstInSequence && isLastInSequence && "rounded-tr-none",
              !isFirstInSequence && !isLastInSequence && "rounded-tr-none rounded-br-none",
              !isFirstInSequence && isLastInSequence && "rounded-tr-none rounded-br-lg",
            ),
          )}
          onClick={(e) => {
            if (message.role === 'user' && !isLatestUserMessage) {
              e.stopPropagation();
              onMessageClick(messageIndex);
            }
          }}
          style={{
            // Ensure all child elements are clickable for user messages that aren't latest
            ...(message.role === 'user' && !isLatestUserMessage && {
              pointerEvents: 'auto'
            })
          }}
        >
          <div 
            className="min-w-0 w-full"
            style={{
              // Make the content area clickable but prevent text selection interference
              ...(message.role === 'user' && !isLatestUserMessage && {
                pointerEvents: 'none'
              })
            }}
          >
            <FormattedMessage content={message.content} />
          </div>
        </div>
      )}
       {message.role === 'user' && message.isIgnored && showIgnoredStatus && (
          <div className="px-2 pt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
             Ignored
          </div>
        )}
    </div>
  );
});
