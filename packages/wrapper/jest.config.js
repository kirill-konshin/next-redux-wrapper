const config = require('next-redux-wrapper-configs/jest.config');
module.exports = {
    ...config,
    collectCoverage: true,
    coveragePathIgnorePatterns: [...config.coveragePathIgnorePatterns, './tests'],
    testEnvironment: 'node',
    testPathIgnorePatterns: [...config.testPathIgnorePatterns, './es6', './lib', './types'],
};
