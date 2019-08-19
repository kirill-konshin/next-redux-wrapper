import config from '../jest-puppeteer.config';

const openPage = (url = '/') => page.goto(`http://localhost:${config.server.port}${url}`);

describe('Basic integration', () => {
    it('shows the page', async () => {
        await openPage();

        await page.waitForSelector('div.index');

        await expect(page).toMatch('Redux tick: server');
        await expect(page).toMatch('Redux toe: was set in _app');
        await expect(page).toMatch('Custom: custom server');
    });

    it('clicks the button', async () => {
        await openPage('/other');

        await page.waitForSelector('div.other');

        await expect(page).toClick('a', {text: 'Navigate to index'});

        await page.waitForSelector('div.index');

        await expect(page).toMatch('Redux tick: client');
        await expect(page).toMatch('Redux toe: was set in _app');
        await expect(page).toMatch('Custom: custom client');
    });
});
