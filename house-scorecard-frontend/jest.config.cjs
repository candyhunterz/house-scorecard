module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\.(js|jsx)$': ['babel-jest', { 
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: [
        ['babel-plugin-transform-vite-meta-env', {
          'import.meta.env.VITE_API_URL': 'http://localhost:8000/api'
        }]
      ]
    }],
  },
  setupFiles: ['<rootDir>/src/setupTests.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-router|react-router-dom)/)'
  ]
};