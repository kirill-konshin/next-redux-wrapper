import React, {FC} from 'react';
import App, {AppProps} from 'next/app';
import {END} from 'redux-saga';
import {Provider} from 'react-redux';
import {SagaStore, wrapper} from '../components/store';

const MyApp: FC<AppProps> = function MyApp({Component, pageProps}) {
    const store = wrapper.useStore();
    return (
        <Provider store={store}>
            <Component {...pageProps} />
        </Provider>
    );
};

(MyApp as any).getInitialProps = wrapper.getInitialAppProps(store => async context => {
    // 1. Wait for all page actions to dispatch
    const pageProps = {
        // https://nextjs.org/docs/advanced-features/custom-app#caveats
        ...(await App.getInitialProps(context as any)).pageProps,
    };

    // 2. Stop the saga if on server
    if (context.ctx.req) {
        store.dispatch(END);
        await (store as SagaStore).sagaTask.toPromise();
    }

    // 3. Return props
    return {pageProps};
});

export default MyApp;
