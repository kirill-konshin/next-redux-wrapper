import config from '../jest-puppeteer.config';

const openPage = (url = '/') => page.goto(`http://localhost:${config.server.port}${url}`);

describe('Basic integration', () => {
    it('shows the page', async () => {
        await openPage();

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"page": "was set in index page /"');
        await expect(page).toMatch('"custom": "custom"');
    });

    it('clicks the button', async () => {
        await openPage('/other');

        await page.waitForSelector('div.other');

        await expect(page).toMatch('"page": "was set in other page {}"');

        await expect(page).toClick('a', {text: 'Navigate to index'});

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"page": "was set in index page');
        await expect(page).toMatch('"custom": "custom"');
    });
});
