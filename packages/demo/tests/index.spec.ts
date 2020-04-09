import config from '../jest-puppeteer.config';

const openPage = (url = '/') => page.goto(`http://localhost:${config.server.port}${url}`);

describe('Using App wrapper', () => {
    it('shows server values when page is visited directly', async () => {
        await openPage();

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"pageProp": "server"');
        await expect(page).toMatch('"appProp": "/"');
        await expect(page).toMatch('"app": "was set in _app"');
        await expect(page).toMatch('"page": "server"');
    });

    it('shows client values when page is visited after navigation', async () => {
        await openPage('/other');

        await page.waitForSelector('div.other');

        await expect(page).toClick('a', {text: 'Navigate to index'});

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"app": "was set in _app"');
        await expect(page).toMatch('"page": "client"');
    });

    it('properly combines props from _app and page', async () => {
        await openPage('/other');

        await page.waitForSelector('div.other');

        await expect(page).toMatch('"getServerSideProp": "bar"');
        await expect(page).toMatch('"page": "other"');
        await expect(page).toMatch('"appProp": "/other"');
    });
});
