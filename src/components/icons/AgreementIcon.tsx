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
      {/* Documento */}
      <rect x="4" y="6" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Linhas do documento */}
      <line x1="7" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Aperto de mãos (simplificado) */}
      <path
        d="M6 8C6 8 8 6 10 6C11 6 11.5 6.5 12 7C12.5 6.5 13 6 14 6C16 6 18 8 18 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10 6L10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 6L14 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Círculo do cifrão */}
      <circle cx="17" cy="19" r="3.5" fill="hsl(var(--warning))" stroke="currentColor" strokeWidth="1" />
      
      {/* Símbolo do cifrão */}
      <text
        x="17"
        y="20.5"
        fontSize="5"
        fontWeight="bold"
        textAnchor="middle"
        fill="currentColor"
      >
        $
      </text>
    </svg>
  );
};
