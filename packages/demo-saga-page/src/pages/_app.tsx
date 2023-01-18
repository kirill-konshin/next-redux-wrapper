import React, {FC} from 'react';
import {AppProps} from 'next/app';
import {wrapper} from '../components/store';
import {Provider} from 'react-redux';

const MyApp: FC<AppProps> = function MyApp({Component, pageProps}) {
    const store = wrapper.useStore();
    return (
        <Provider store={store}>
            <Component {...pageProps} />
        </Provider>
    );
};

export default MyApp;
