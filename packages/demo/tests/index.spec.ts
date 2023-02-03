import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, baseURL: string | undefined, url = '/') => page.goto(`${baseURL}${url}`);

test('shows server values when page is visited directly', async ({page, baseURL}) => {
    await openPage(page, baseURL);

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"pageProp": "server"'); // props
    await expect(page.locator('body')).toContainText('"appProp": "/"'); // props
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
    await expect(page.locator('body')).toContainText('"page": "server"'); // redux
});

test('shows client values when page is visited after navigation', async ({page, baseURL}) => {
    await openPage(page, baseURL, '/server');

    await page.waitForSelector('div.server');

    await page.click('text=Navigate to index');

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"app": "was set in _app"');
    await expect(page.locator('body')).toContainText('"page": "client"');
});

test("properly combines state from App.getInitialProps and page's getServerSideProps", async ({page, baseURL}) => {
    await openPage(page, baseURL, '/server');

    await page.waitForSelector('div.server');

    await expect(page.locator('body')).toContainText('"getServerSideProp": "bar"'); // props
    await expect(page.locator('body')).toContainText('"appProp": "/server"'); // props
    await expect(page.locator('body')).toContainText('"page": "server"'); // redux
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
});

test("properly combines state from App.getInitialProps and page's getStaticProps", async ({page, baseURL}) => {
    await openPage(page, baseURL, '/static');

    await page.waitForSelector('div.static');

    await expect(page.locator('body')).toContainText('"getStaticProp": "bar"'); // props
    await expect(page.locator('body')).toContainText('"appProp": "/static"'); // props
    await expect(page.locator('body')).toContainText('"page": "static"'); // redux
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
});

test('other page -> static', async ({page, baseURL}) => {
    await openPage(page, baseURL, '/');

    await page.waitForSelector('div.index');

    await page.click('text=Navigate to static');

    await expect(page.locator('body')).toContainText('"page": "static"'); // redux
    await expect(page.locator('body')).toContainText('"app": "was set in _app"'); // redux
});

test('initial page props with wrapper and dispatch', async ({page, baseURL}) => {
    await openPage(page, baseURL, '/pageProps');

    await page.waitForSelector('div.pageProps');

    await expect(page.locator('body')).toContainText('"appProp":"/pageProps"');
    await expect(page.locator('body')).toContainText('"prop":"foo"');
    await expect(page.locator('body')).toContainText('"page":"pageProps"');
});

test('initial page props without wrapper and dispatch', async ({page, baseURL}) => {
    await openPage(page, baseURL, '/pageProps2');

    await page.waitForSelector('div.pageProps');

    await expect(page.locator('body')).toContainText('"prop":"bar"');
    await expect(page.locator('body')).toContainText('"appProp":"/pageProps2"');
});
