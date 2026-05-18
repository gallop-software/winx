import nextConfig from 'eslint-config-next'
import gallop from '@gallop.software/canon/eslint'

export default [
  ...nextConfig,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      // Disable overly strict React 19 rules that flag common valid patterns
      'react-hooks/set-state-in-effect': 'off', // setMounted(true) in useEffect is valid
      'react-hooks/refs': 'off', // Common ref patterns are valid
      'react-hooks/immutability': 'off', // Function hoisting is fine in components
    },
  },
  {
    // Gallop governance rules - only for blocks and components
    files: ['src/app/**/_blocks/**/*.tsx', 'src/components/**/*.tsx'],
    plugins: {
      gallop,
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(gallop.recommended).map(([key]) => [key, 'error'])
      ),
      'gallop/no-raw-colors': [
        'error',
        { allowedClasses: ['text-red-500', 'text-yellow-400'] },
      ],
    },
  },
]
