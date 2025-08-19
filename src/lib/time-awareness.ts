import type { Persona } from './types';

export interface TimeContext {
  timePassed: string;
  shouldMention: boolean;
  contextHint: string;
}

export function getTimeAwarenessContext(persona: Persona): TimeContext {
  const now = Date.now();
  const lastChatTime = persona.lastChatTime;
  
  // If no previous chat time, this is the first interaction
  if (!lastChatTime) {
    return {
      timePassed: 'first interaction',
      shouldMention: false,
      contextHint: 'This is your first conversation with this user.'
    };
  }
  
  const timeDiff = now - lastChatTime;
  const minutes = Math.floor(timeDiff / (1000 * 60));
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));
  const months = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30));
  
  let timePassed: string;
  let shouldMention: boolean;
  let contextHint: string;
  
  if (minutes < 5) {
    timePassed = 'just now';
    shouldMention = false;
    contextHint = 'You just spoke moments ago. Continue naturally without mentioning time.';
  } else if (minutes < 30) {
    timePassed = `${minutes} minutes ago`;
    shouldMention = false;
    contextHint = 'Recent conversation. No need to mention time unless it fits naturally.';
  } else if (hours < 2) {
    const roundedHours = Math.max(1, Math.round(minutes / 60));
    timePassed = `about ${roundedHours} hour${roundedHours > 1 ? 's' : ''} ago`;
    shouldMention = shouldMentionBasedOnPersona(persona, 'short_break');
    contextHint = 'Short break in conversation. Mention time only if it fits your personality and relationship.';
  } else if (hours < 12) {
    timePassed = `${hours} hours ago`;
    shouldMention = shouldMentionBasedOnPersona(persona, 'several_hours');
    contextHint = 'Several hours have passed. Consider acknowledging the time gap naturally based on your relationship.';
  } else if (days < 2) {
    timePassed = days === 1 ? 'yesterday' : `${days} days ago`;
    shouldMention = shouldMentionBasedOnPersona(persona, 'day_or_two');
    contextHint = 'A day or two has passed. Naturally acknowledge this based on your personality and relationship closeness.';
  } else if (days < 7) {
    timePassed = `${days} days ago`;
    shouldMention = shouldMentionBasedOnPersona(persona, 'several_days');
    contextHint = 'Several days have passed. This warrants natural acknowledgment based on your relationship.';
  } else if (weeks < 4) {
    timePassed = weeks === 1 ? 'a week ago' : `${weeks} weeks ago`;
    shouldMention = shouldMentionBasedOnPersona(persona, 'weeks');
    contextHint = 'Weeks have passed. Definitely acknowledge this time gap naturally - ask how they\'ve been, etc.';
  } else if (months < 12) {
    timePassed = months === 1 ? 'a month ago' : `${months} months ago`;
    shouldMention = true;
    contextHint = 'Months have passed! Definitely acknowledge this significant time gap. Ask about what\'s happened, how they\'ve been, etc.';
  } else {
    const years = Math.floor(months / 12);
    timePassed = years === 1 ? 'a year ago' : `${years} years ago`;
    shouldMention = true;
    contextHint = 'A very long time has passed! This is a major reunion. Acknowledge the time gap warmly and ask about their life.';
  }
  
  return { timePassed, shouldMention, contextHint };
}

function shouldMentionBasedOnPersona(persona: Persona, timeCategory: string): boolean {
  const relation = persona.relation.toLowerCase();
  const traits = persona.traits.toLowerCase();
  const responseStyle = persona.responseStyle.toLowerCase();
  
  // Close relationships are more likely to mention time gaps
  const isCloseRelation = relation.includes('friend') || relation.includes('family') || 
                         relation.includes('partner') || relation.includes('spouse') ||
                         relation.includes('sibling') || relation.includes('parent') ||
                         relation.includes('child') || relation.includes('close');
  
  // Caring/attentive personalities mention time more
  const isCaringPersonality = traits.includes('caring') || traits.includes('attentive') ||
                             traits.includes('thoughtful') || traits.includes('concerned') ||
                             traits.includes('loving') || traits.includes('nurturing');
  
  // Formal/professional styles mention time less casually
  const isFormalStyle = responseStyle.includes('formal') || responseStyle.includes('professional') ||
                       responseStyle.includes('polite') || responseStyle.includes('respectful');
  
  // Casual/friendly styles mention time more naturally
  const isCasualStyle = responseStyle.includes('casual') || responseStyle.includes('friendly') ||
                       responseStyle.includes('warm') || responseStyle.includes('conversational');
  
  switch (timeCategory) {
    case 'short_break':
      return false; // Almost never mention short breaks
    case 'several_hours':
      return (isCloseRelation && isCaringPersonality) || isCasualStyle;
    case 'day_or_two':
      return isCloseRelation || isCaringPersonality || isCasualStyle;
    case 'several_days':
      return true; // Most personas would mention this
    case 'weeks':
      return true; // Definitely mention weeks
    default:
      return true;
  }
}

export function generateTimeAwarenessPrompt(persona: Persona): string {
  const timeContext = getTimeAwarenessContext(persona);
  
  if (!timeContext.shouldMention && timeContext.timePassed === 'first interaction') {
    return ''; // No special prompt for first interaction
  }
  
  if (!timeContext.shouldMention) {
    return `\n\nTime Context: You last spoke ${timeContext.timePassed}. ${timeContext.contextHint}`;
  }
  
  return `\n\nTime Awareness: You last spoke with this user ${timeContext.timePassed}. ${timeContext.contextHint} Acknowledge this naturally in your response based on your personality, relationship, and the time that has passed. Don't force it - let it flow naturally into the conversation.`;
}
