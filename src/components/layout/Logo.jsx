export default function Logo({ size = 48 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="logo-tria"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#06B6D4', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#3B82F6', stopOpacity:1}} />
        </linearGradient>
        
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#3B82F6', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#A855F7', stopOpacity:1}} />
        </linearGradient>
        
        <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor:'#06B6D4', stopOpacity:1}} />
          <stop offset="50%" style={{stopColor:'#10B981', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#F59E0B', stopOpacity:1}} />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <path d="M 30 90 L 60 20 L 50 30 L 25 85 Z" 
            stroke="url(#grad1)" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
            filter="url(#glow)"/>
      
      <path d="M 30 90 L 90 90 L 85 85 L 35 85 Z" 
            stroke="url(#grad2)" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
            filter="url(#glow)"/>
      
      <path d="M 60 20 L 90 90 L 85 85 L 62 28 Z" 
            stroke="url(#grad3)" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
            filter="url(#glow)"/>
      
      <path d="M 45 50 L 60 30 L 75 50 Z" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
            opacity="0.9"/>
    </svg>
  )
}
