import config from '../jest-puppeteer.config';

const openPage = (url = '/') => page.goto(`http://localhost:${config.server.port}${url}`);

describe('Using App wrapper', () => {
    it('shows server values when page is visited directly', async () => {
        await openPage();

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"custom": "server"');
        await expect(page).toMatch('"app": "was set in _app"');
        await expect(page).toMatch('"page": "server"');
    });

    it('shows client values when page is visited after navigation', async () => {
        await openPage('/other');

        await page.waitForSelector('div.other');

        await expect(page).toClick('a', {text: 'Navigate to index'});

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"custom": "client"');
        await expect(page).toMatch('"app": "was set in _app"');
        await expect(page).toMatch('"page": "client"');
    });
});
