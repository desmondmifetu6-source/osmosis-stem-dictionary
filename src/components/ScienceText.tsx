import React, { useEffect, useRef } from 'react';
import { renderScienceIntoElement } from '../engine/dictionaryService';

interface ScienceTextProps {
  text: string;
  className?: string;
}

export const ScienceText: React.FC<ScienceTextProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderScienceIntoElement(containerRef.current, text);
  }, [text]);

  return <div ref={containerRef} className={`science-prose ${className}`}>{text}</div>;
};
