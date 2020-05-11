module.exports = {
    coveragePathIgnorePatterns: ['./node_modules', './.next'],
    testPathIgnorePatterns: ['./node_modules'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
};
