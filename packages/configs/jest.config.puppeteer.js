const config = require('./jest.config');
module.exports = {
    ...config,
    preset: 'jest-puppeteer',
    coveragePathIgnorePatterns: config.coveragePathIgnorePatterns.concat('./jest-puppeteer.config.js'),
};
