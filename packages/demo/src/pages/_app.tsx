import React from 'react';
import App, {AppProps} from 'next/app';
import {Provider} from 'react-redux';
import {wrapper} from '../components/store';

export default function MyApp({Component, pageProps}: AppProps) {
    const store = wrapper.useStore();
    return (
        <Provider store={store}>
            <Component {...pageProps} />
        </Provider>
    );
}

//FIXME This is not a recommended approach, only used here for demo purposes
(MyApp as any).getInitialProps = wrapper.getInitialAppProps(store => async context => {
    // Keep in mind that this will be called twice on server, one for page and second for error page
    store.dispatch({type: 'APP', payload: 'was set in _app'});

    await store.dispatch({
        type: 'PROMISE_APP',
        payload: new Promise(res => setTimeout(() => res('bar'), 1)),
    });

    return {
        pageProps: {
            // https://nextjs.org/docs/advanced-features/custom-app#caveats
            ...(await App.getInitialProps(context as any)).pageProps,
            // Some custom thing for all pages
            appProp: context.ctx.pathname,
        },
    };
});
