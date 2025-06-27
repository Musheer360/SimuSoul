'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedChatTitleProps {
    title: string;
}

export function AnimatedChatTitle({ title }: AnimatedChatTitleProps) {
    const [displayedTitle, setDisplayedTitle] = useState(title);
    const prevTitleRef = useRef(title);

    useEffect(() => {
        const prevTitle = prevTitleRef.current;
        let backspaceInterval: NodeJS.Timeout | undefined;
        let typeInterval: NodeJS.Timeout | undefined;

        // Animate only if the title changes FROM "New Chat" TO something else.
        if (prevTitle === 'New Chat' && title !== 'New Chat') {
            let i = prevTitle.length;
            backspaceInterval = setInterval(() => {
                setDisplayedTitle(current => current.slice(0, -1));
                i--;
                if (i < 0) { // Go one step further to have an empty string
                    clearInterval(backspaceInterval);
                    let j = 0;
                    typeInterval = setInterval(() => {
                        setDisplayedTitle(title.slice(0, j + 1));
                        j++;
                        if (j >= title.length) {
                            clearInterval(typeInterval);
                        }
                    }, 75);
                }
            }, 50);
        } else {
             // For any other case, just update the title directly.
             setDisplayedTitle(title);
        }
        
        // Update ref after effect logic
        prevTitleRef.current = title;
        
        return () => {
            if (backspaceInterval) clearInterval(backspaceInterval);
            if (typeInterval) clearInterval(typeInterval);
        };
    }, [title]);

    return <>{displayedTitle}</>;
}
