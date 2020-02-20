module.exports = {
    collectCoverage: true,
    coveragePathIgnorePatterns: ['./node_modules', './.next'],
    testPathIgnorePatterns: ['./node_modules'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
};
