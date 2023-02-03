/** @type {import('@jest/types').Config.GlobalConfig} */
module.exports = {
    preset: 'ts-jest',
    collectCoverage: true,
    coveragePathIgnorePatterns: ['./node_modules', './.next', './tests'],
    coverageReporters: ['text', 'lcov'],
    coverageProvider: 'v8',
    testEnvironment: 'node',
};
