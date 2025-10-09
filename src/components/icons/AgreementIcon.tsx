interface AgreementIconProps {
  className?: string;
  size?: number;
}

export const AgreementIcon = ({ className = "", size = 24 }: AgreementIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bolhas de chat */}
      <g>
        {/* Bolha esquerda */}
        <rect x="2" y="2" width="10" height="6" rx="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8 L4 10 L6 8.5" fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Pontos */}
        <circle cx="4.5" cy="5" r="0.8" fill="currentColor" />
        <circle cx="7" cy="5" r="0.8" fill="currentColor" />
        <circle cx="9.5" cy="5" r="0.8" fill="currentColor" />
        
        {/* Bolha direita */}
        <rect x="12" y="2" width="10" height="6" rx="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
        <path d="M19 8 L20 10 L18 8.5" fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Ponto */}
        <circle cx="17" cy="5" r="0.8" fill="currentColor" />
      </g>

      {/* Aperto de mãos */}
      <g>
        {/* Manga esquerda (azul) */}
        <path
          d="M2 18 L2 20 L6 20 L8 17 L6 14 L2 14 Z"
          fill="#5BA4CF"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Manga direita (azul) */}
        <path
          d="M22 18 L22 20 L18 20 L16 17 L18 14 L22 14 Z"
          fill="#5BA4CF"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Mão esquerda (tom de pele) */}
        <path
          d="M6 14 L8 14 L10 15.5 L12 17 L13 17.5 L13 19 L11 20 L9 19.5 L7 18 L6 17 Z"
          fill="#F4C4A0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Mão direita (tom de pele) */}
        <path
          d="M18 14 L16 14 L14 15.5 L12 17 L11 17.5 L11 19 L13 20 L15 19.5 L17 18 L18 17 Z"
          fill="#F4C4A0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Dedos entrelaçados */}
        <ellipse cx="12" cy="17.5" rx="1.5" ry="2.5" fill="#F4C4A0" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Linhas dos dedos */}
        <line x1="9" y1="16" x2="9" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="10.5" y1="16" x2="10.5" y2="19.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="13.5" y1="16" x2="13.5" y2="19.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="15" y1="16" x2="15" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
};
