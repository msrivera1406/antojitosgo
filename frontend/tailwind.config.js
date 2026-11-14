/** Tokens de diseño de AntojitosGo. Ver .kiro/steering/diseno-ux-ui.md (sección 10). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Rojo cálido: acción principal, selección e identidad.
        primario: {
          50: '#FFF4F2', 100: '#FFE6E2', 200: '#FFCFC8', 300: '#FFA99E', 400: '#F57B6C',
          500: '#E0503F', 600: '#C63B2C', 700: '#A32E22', 800: '#84271E', 900: '#6B241D',
        },
        // Rosados y crema: superficies y fondos secundarios.
        crema: { 50: '#FFFBF9', 100: '#FFF6F2', 200: '#FCE8E4' },
        // Grises cálidos: texto, iconos y estructura.
        tinta: {
          50: '#FAF7F5', 100: '#F2EDEA', 200: '#E6DFDB', 300: '#D3CAC5', 400: '#A89E98',
          500: '#7C726C', 600: '#5E5550', 700: '#473F3B', 800: '#302A27', 900: '#1F1A18',
        },
        // Estados semánticos.
        verificado: { DEFAULT: '#2F7D4F', suave: '#E6F3EA' },
        comunidad: { DEFAULT: '#2B6CB0', suave: '#E7F0FA' },
        aviso: { DEFAULT: '#9A5B00', suave: '#FFF1D6' },
        peligro: { DEFAULT: '#B42318', suave: '#FDE8E6' },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala tipográfica (tamaño, interlineado).
        'etiqueta': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'subtitulo': ['1.125rem', { lineHeight: '1.65rem' }],
        'titulo-3': ['1.25rem', { lineHeight: '1.75rem' }],
        'titulo-2': ['1.5rem', { lineHeight: '2rem' }],
        'titulo-1': ['1.875rem', { lineHeight: '2.25rem' }],
        'display': ['2.25rem', { lineHeight: '2.6rem' }],
      },
      borderRadius: { suave: '0.75rem', tarjeta: '1.25rem', panel: '1.75rem' },
      boxShadow: {
        tarjeta: '0 1px 2px rgba(48,42,39,0.06), 0 2px 8px rgba(48,42,39,0.06)',
        elevada: '0 4px 20px rgba(48,42,39,0.12)',
        panel: '0 -6px 24px rgba(48,42,39,0.14)',
      },
      minHeight: { toque: '2.75rem' },
      minWidth: { toque: '2.75rem' },
      spacing: { nav: '4.5rem' },
      keyframes: {
        'subir': { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'aparecer': { from: { opacity: '0' }, to: { opacity: '1' } },
        'onda': { '0%': { transform: 'scale(1)', opacity: '0.45' }, '100%': { transform: 'scale(1.9)', opacity: '0' } },
        'barra': { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        subir: 'subir 220ms ease-out both',
        aparecer: 'aparecer 180ms ease-out both',
        onda: 'onda 1.6s ease-out infinite',
        barra: 'barra 900ms ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
