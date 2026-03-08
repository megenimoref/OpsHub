export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['0.8125rem', { lineHeight: '1.5' }],
        'sm':   ['0.9375rem', { lineHeight: '1.55' }],
        'base': ['1.0625rem', { lineHeight: '1.6'  }],
        'lg':   ['1.1875rem', { lineHeight: '1.5'  }],
        'xl':   ['1.375rem',  { lineHeight: '1.4'  }],
        '2xl':  ['1.625rem',  { lineHeight: '1.3'  }],
        '3xl':  ['2rem',      { lineHeight: '1.25' }],
        '4xl':  ['2.5rem',    { lineHeight: '1.2'  }],
      },
    },
  },
  plugins: [],
};
