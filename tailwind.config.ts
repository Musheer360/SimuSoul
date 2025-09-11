import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'shine-effect': {
          'from': { transform: 'translateX(-100%)' },
          'to': { transform: 'translateX(100%)' },
        },
        'typing-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'animated-gradient': {
          '0%': { 'background-position': '0% 50%' },
          '100%': { 'background-position': '100% 50%' },
        },
        'message-spawn-left': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(20px) scale(0.9)',
            transformOrigin: 'bottom left'
          },
          '60%': { 
            opacity: '0.8', 
            transform: 'translateY(-2px) scale(1.02)',
            transformOrigin: 'bottom left'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)',
            transformOrigin: 'bottom left'
          },
        },
        'message-spawn-right': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(20px) scale(0.9)',
            transformOrigin: 'bottom right'
          },
          '60%': { 
            opacity: '0.8', 
            transform: 'translateY(-2px) scale(1.02)',
            transformOrigin: 'bottom right'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)',
            transformOrigin: 'bottom right'
          },
        },
        'typing-to-message': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.02)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-out': 'fade-out 0.15s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.7s ease-out forwards',
        'typing-dot-1': 'typing-bounce 1.2s infinite ease-in-out',
        'typing-dot-2': 'typing-bounce 1.2s infinite ease-in-out 0.2s',
        'typing-dot-3': 'typing-bounce 1.2s infinite ease-in-out 0.4s',
        'animated-gradient': 'animated-gradient 6s ease-in-out infinite alternate',
        'message-spawn-left': 'message-spawn-left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'message-spawn-right': 'message-spawn-right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'typing-to-message': 'typing-to-message 0.2s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
