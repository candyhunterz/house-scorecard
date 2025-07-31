module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\.(js|jsx)$': 'babel-jest',
  },
};