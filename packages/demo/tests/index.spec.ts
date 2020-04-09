import config from '../jest-puppeteer.config';

const openPage = (url = '/') => page.goto(`http://localhost:${config.server.port}${url}`);

describe('Using App wrapper', () => {
    it('shows server values when page is visited directly', async () => {
        await openPage();

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"pageProp": "server"'); // props
        await expect(page).toMatch('"appProp": "/"'); // props
        await expect(page).toMatch('"app": "was set in _app"'); // redux
        await expect(page).toMatch('"page": "server"'); // redux
    });

    it('shows client values when page is visited after navigation', async () => {
        await openPage('/server');

        await page.waitForSelector('div.server');

        await expect(page).toClick('a', {text: 'Navigate to index'});

        await page.waitForSelector('div.index');

        await expect(page).toMatch('"app": "was set in _app"');
        await expect(page).toMatch('"page": "client"');
    });

    it("properly combines state from App.getInitialProps and page's getServerSideProps", async () => {
        await openPage('/server');

        await page.waitForSelector('div.server');

        await expect(page).toMatch('"getServerSideProp": "bar"'); // props
        await expect(page).toMatch('"appProp": "/server"'); // props
        await expect(page).toMatch('"page": "server"'); // redux
        await expect(page).toMatch('"app": "was set in _app"'); // redux
    });

    it("properly combines state from App.getInitialProps and page's getStaticProps", async () => {
        await openPage('/static');

        await page.waitForSelector('div.static');

        await expect(page).toMatch('"getStaticProp": "bar"'); // props
        await expect(page).toMatch('"appProp": "/static"'); // props
        await expect(page).toMatch('"page": "static"'); // redux
        await expect(page).toMatch('"app": "was set in _app"'); // redux
    });
});
