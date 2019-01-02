module.exports = {
    testPathIgnorePatterns: [
        './node_modules'
    ],
    collectCoverage: true,
    coveragePathIgnorePatterns: [
        './node_modules',
    ],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testRegex: '/tests/.*\\.(test|spec)\\.tsx?$',
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json'
    ]
};