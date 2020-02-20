const config = require('next-redux-wrapper-configs/jest.config');
module.exports = {
    ...config,
    testEnvironment: 'node',
    testPathIgnorePatterns: [...config.testPathIgnorePatterns, './es6', './lib', './types'],
};
