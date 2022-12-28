import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, url = '/') => page.goto(`http://localhost:3000${url}`);

test('shows server values when page is visited directly', async ({page}) => {
    await openPage(page);

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"pageProp": "server"'); // props
    await expect(page.locator('body')).toContainText('"appProp": "/"'); // props
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
    await expect(page.locator('body')).toContainText('"page": "server"'); // redux
});

test('shows client values when page is visited after navigation', async ({page}) => {
    await openPage(page, '/server');

    await page.waitForSelector('div.server');

    await page.click('text=Navigate to index');

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"app": "was set in _app"');
    await expect(page.locator('body')).toContainText('"page": "client"');
});

test("properly combines state from App.getInitialProps and page's getServerSideProps", async ({page}) => {
    await openPage(page, '/server');

    await page.waitForSelector('div.server');

    await expect(page.locator('body')).toContainText('"getServerSideProp": "bar"'); // props
    await expect(page.locator('body')).toContainText('"appProp": "/server"'); // props
    await expect(page.locator('body')).toContainText('"page": "server"'); // redux
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
});

test("properly combines state from App.getInitialProps and page's getStaticProps", async ({page}) => {
    await openPage(page, '/static');

    await page.waitForSelector('div.static');

    await expect(page.locator('body')).toContainText('"getStaticProp": "bar"'); // props
    await expect(page.locator('body')).toContainText('"appProp": "/static"'); // props
    await expect(page.locator('body')).toContainText('"page": "static"'); // redux
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
});

test('other page -> static', async ({page}) => {
    await openPage(page, '/');

    await page.waitForSelector('div.index');

    await page.click('text=Navigate to static');

    await expect(page.locator('body')).toContainText('"page": "static"'); // redux
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
});

test('initial page props with wrapper and dispatch', async ({page}) => {
    await openPage(page, '/pageProps');

    await page.waitForSelector('div.pageProps');

    await expect(page.locator('body')).toContainText('{"props":{"appProp":"/pageProps","prop":"foo"},"page":"pageProps"}');
});

test('initial page props without wrapper and dispatch', async ({page}) => {
    await openPage(page, '/pageProps2');

    await page.waitForSelector('div.pageProps');

    await expect(page.locator('body')).toContainText('{"prop":"bar","appProp":"/pageProps2"}');
});
