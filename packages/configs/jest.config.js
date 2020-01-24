module.exports = {
    testPathIgnorePatterns: ['./node_modules'],
    collectCoverage: true,
    coveragePathIgnorePatterns: ['./node_modules'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
