/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
    use: {
        trace: process.env.CI ? 'retain-on-failure' : 'off',
        video: 'retain-on-failure',
        screenshot: 'on',
    },
    outputDir: process.cwd() + '/test-results/out',
    reporter: [
        ['html', {outputFolder: process.cwd() + '/test-results/html', open: 'never'}],
        ['list'],
        ['junit', {outputFile: process.cwd() + '/test-results/junit.xml'}],
        ['json', {outputFile: process.cwd() + '/test-results/results.json'}],
    ],
    webServer: {
        command: 'yarn start',
        port: 3000,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },
};
