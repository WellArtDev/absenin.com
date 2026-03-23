/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WhatsApp Brand Colors
        whatsapp: {
          primary: '#25D366',
          dark: '#128C7E',
          teal: '#075E54',
          light: '#DCF8C6',
          background: '#EFEAE2',
        },

        // Modern Tech Colors
        tech: {
          accent: '#00A884',
          success: '#25D366',
          warning: '#FFD93D',
          danger: '#FF6B6B',
          info: '#4A90E2',
        },

        // UI Colors
        ui: {
          background: '#F0F2F5',
          card: '#FFFFFF',
          text: {
            primary: '#111B21',
            secondary: '#54656F',
            tertiary: '#8696A0',
          },
          border: '#E9EDEF',
        },
      },

      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 20px rgba(37, 211, 102, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },

      backdropBlur: {
        'glass': '12px',
      },

      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        'gradient-dark': 'linear-gradient(135deg, #128C7E 0%, #075E54 100%)',
        'gradient-teal': 'linear-gradient(135deg, #075E54 0%, #00A884 100%)',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
      },

      borderRadius: {
        'glass': '20px',
        'card': '16px',
        'button': '12px',
      },

      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(37, 211, 102, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(37, 211, 102, 0.5)' },
        },
      },

      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
