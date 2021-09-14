import {PlaywrightTestConfig} from '@playwright/test';
import defaultConfig from 'next-redux-wrapper-configs/playwright';

const config: PlaywrightTestConfig = {
    ...defaultConfig,
    webServer: {
        ...defaultConfig.webServer,
        port: 5050,
    },
};

export default config;
