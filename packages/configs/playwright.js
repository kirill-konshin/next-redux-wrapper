module.exports = {
    webServer: {
        command: 'yarn start',
        port: 3000,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },
};
