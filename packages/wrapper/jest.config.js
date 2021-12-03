module.exports = {
    preset: 'ts-jest',
    collectCoverage: true,
    coveragePathIgnorePatterns: ['./node_modules', './.next', './tests'],
    testEnvironment: 'node',
};
