import config from '../jest-puppeteer.config';

const openPage = (url = '/') => page.goto(`http://localhost:${config.server.port}${url}`);

describe('Basic integration', () => {
    it('shows the page', async () => {
        await openPage();

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"page": "async text"');
        await expect(page).toMatch('"custom": "custom"');
    });
});
