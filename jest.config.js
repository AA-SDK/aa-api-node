export default {
  preset: 'ts-jest/presets/js-with-ts',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json'
      }
    ]
  },
  clearMocks: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['html-spa', 'text']
}
