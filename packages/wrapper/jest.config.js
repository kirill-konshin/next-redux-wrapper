const config = require('next-redux-wrapper-configs/jest.config');
module.exports = Object.assign({}, config, {
    roots: ['<rootDir>/src'],
    testPathIgnorePatterns: config.testPathIgnorePatterns.concat(['./es6', './lib', './types']),
    testEnvironment: 'node',
});
