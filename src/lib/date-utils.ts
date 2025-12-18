/**
 * Utility functions for date formatting in messaging app style
 */

export interface DateSeparatorInfo {
  show: boolean;
  label: string;
}

/**
 * Formats a timestamp into a messaging-app style date label
 * Examples: "Today", "Yesterday", "December 16", "Dec 16, 2023"
 */
export function formatMessageDate(timestamp: number): string {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time parts for comparison
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (messageDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    const daysDiff = Math.floor((todayOnly.getTime() - messageDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    // Within last 7 days, show day name
    if (daysDiff < 7 && daysDiff > 1) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Same year, show month and day
    if (messageDate.getFullYear() === today.getFullYear()) {
      return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    
    // Different year, show full date
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Formats timestamp into time string (e.g., "10:30 AM")
 */
export function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Checks if two timestamps are on different days
 */
export function isDifferentDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  
  return date1.getFullYear() !== date2.getFullYear() ||
         date1.getMonth() !== date2.getMonth() ||
         date1.getDate() !== date2.getDate();
}

/**
 * Determines if a date separator should be shown between two messages
 */
export function shouldShowDateSeparator(
  currentTimestamp: number,
  previousTimestamp: number | undefined
): DateSeparatorInfo {
  if (!previousTimestamp) {
    return {
      show: true,
      label: formatMessageDate(currentTimestamp),
    };
  }
  
  if (isDifferentDay(currentTimestamp, previousTimestamp)) {
    return {
      show: true,
      label: formatMessageDate(currentTimestamp),
    };
  }
  
  return {
    show: false,
    label: '',
  };
}

/**
 * Checks if enough time has passed to create a new backend session
 * Default threshold is 1 hour
 */
export function shouldCreateNewSession(
  lastMessageTime: number | undefined,
  currentTime: number,
  thresholdMinutes: number = 60
): boolean {
  if (!lastMessageTime) {
    return true;
  }
  
  const timeDiff = currentTime - lastMessageTime;
  const minutesDiff = timeDiff / (1000 * 60);
  
  return minutesDiff >= thresholdMinutes;
}
