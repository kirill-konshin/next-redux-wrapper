module.exports = {
    preset: 'jest-puppeteer',
    testPathIgnorePatterns: [
        './.idea',
        './.next',
        './lib',
        './node_modules'
    ],
    collectCoverage: true,
    coveragePathIgnorePatterns: [
        "./node_modules",
        "./jest-puppeteer.config.js"
    ]
};