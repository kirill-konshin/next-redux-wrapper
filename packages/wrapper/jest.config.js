const config = require('../../jest.config');
module.exports = Object.assign({}, config, {
    roots: [
        '<rootDir>/src',
        '<rootDir>/tests'
    ],
    testPathIgnorePatterns: config.testPathIgnorePatterns.concat([
        './es6',
        './lib',
        './types'
    ]),
    testEnvironment: 'node'
});