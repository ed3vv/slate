'use client';

import React, { useEffect, useState } from 'react';

interface LoginCharactersProps {
  focusedField: 'email' | 'password' | 'username' | null;
  isSurprised?: boolean;
  mousePosition?: { x: number; y: number };
}

export function LoginCharacters({ focusedField, isSurprised, mousePosition }: LoginCharactersProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [characterRect, setCharacterRect] = useState<DOMRect | null>(null);
  const characterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [focusedField]);

  useEffect(() => {
    if (characterRef.current) {
      setCharacterRect(characterRef.current.getBoundingClientRect());
    }
  }, []);

  // Calculate cursor-based position
  const getCursorBasedPosition = () => {
    if (!mousePosition || !characterRect) return { x: 0, y: 0 };

    const centerX = characterRect.left + characterRect.width / 2;
    const centerY = characterRect.top + characterRect.height / 2;

    const deltaX = mousePosition.x - centerX;
    const deltaY = mousePosition.y - centerY;

    // Use a smaller max distance for more responsive tracking
    const maxDistance = 200;

    // Clamp the values to prevent extreme movements
    const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));

    return { x: normalizedX, y: normalizedY };
  };

  const cursorPosition = getCursorBasedPosition();

  // Determine face position based on state
  const getFacePosition = () => {
    // Password always looks away (left)
    if (focusedField === 'password') {
      return { transform: 'translate(-0.5rem, 0)', inline: true };
    }

    // Email/username looks right (peeking)
    if (focusedField === 'email' || focusedField === 'username') {
      return { transform: 'translate(1rem, 0)', inline: true };
    }

    // Follow cursor otherwise
    const xOffset = cursorPosition.x * 1; // Max 1rem movement (doubled from 0.5)
    const yOffset = cursorPosition.y * 1;
    return { transform: `translate(${xOffset}rem, ${yOffset}rem)`, inline: false };
  };

  const facePosition = getFacePosition();
  const isLookingAway = focusedField === 'password';
  const isLookingRight = focusedField === 'email' || focusedField === 'username';

  return (
    <div className="flex items-center justify-center py-8">
      {/* Square Character */}
      <div className="relative" ref={characterRef}>
        <div className="w-32 h-32 bg-primary rounded-2xl flex items-center justify-center relative">
          {/* Face group (eyes and mouth move together) */}
          <div
            className="flex flex-col items-center gap-3"
            style={{
              transform: facePosition.transform,
              transition: facePosition.inline ? 'transform 0.5s ease-in-out' : 'none'
            }}
          >
            {/* Eyes */}
            <div className="flex items-center justify-center gap-4">
              {/* Left Eye - simple dot that morphs to line when looking away */}
              <div className={`bg-primary-foreground rounded-full transition-all duration-500 ease-in-out 
              ${
                isLookingAway ? 'w-4 h-1' : 'w-2 h-2'
              }`} />
              {/* Right Eye - simple dot that morphs to line when looking away */}
              <div className={`bg-primary-foreground rounded-full transition-all duration-500 ease-in-out ${
                isLookingAway ? 'w-4 h-1' : 'w-2 h-2'
              }`} />
            </div>

            {/* Mouth */}
            <div className="w-8 h-4 relative flex items-center justify-center">
              <div className={`transition-all duration-500 ease-in-out ${
                isSurprised || focusedField === 'email' || focusedField === 'username'
                  ? 'w-3 h-3 border-2 border-primary-foreground/70 rounded-full bg-transparent'
                  : 'w-6 h-0.5 bg-primary-foreground/70 rounded-full border-0'
              }`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
