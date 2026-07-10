import { useRef, useEffect, useMemo } from 'react'

interface TextHighlighterProps {
  text: string
  currentWordIndex: number
  onWordClick?: (wordIndex: number) => void
  fontSize?: number
  className?: string
  highlightColor?: string
}

export default function TextHighlighter({
  text,
  currentWordIndex,
  onWordClick,
  fontSize = 16,
  className = '',
  highlightColor,
}: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)

  const words = useMemo(() => text.split(/\s+/), [text])

  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentWordIndex])

  const handleWordClick = (idx: number) => {
    onWordClick?.(idx)
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto leading-relaxed select-none ${className}`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1.8,
        maxHeight: '60vh',
        scrollBehavior: 'smooth',
      }}
    >
      <p className="p-4">
        {words.map((word, idx) => {
          const isActive = idx === currentWordIndex
          return (
            <span
              key={idx}
              ref={isActive ? activeWordRef : undefined}
              onClick={() => handleWordClick(idx)}
              className={`
                inline-block rounded-lg px-0.5 py-0.5 cursor-pointer transition-all duration-200
                ${isActive
                  ? 'animate-highlight-pulse relative font-semibold -mx-0.5 px-1.5'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              style={isActive ? {
                background: highlightColor || 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                color: 'var(--text-primary)',
                transform: 'scale(1.02)',
                borderRadius: '6px',
              } : {
                color: 'var(--text-primary)',
              }}
            >
              {word}
            </span>
          )
        })}
      </p>
    </div>
  )
}
