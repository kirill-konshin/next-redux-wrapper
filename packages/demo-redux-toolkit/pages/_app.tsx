import React from 'react';
import {Provider} from 'react-redux';
import App, {AppProps} from 'next/app';
import {fetchSystem, wrapper} from '../store';

interface PageProps {
    pageProps: {
        id: number;
    };
}

const MyApp = ({Component, pageProps}: Omit<AppProps, 'pageProps'> & PageProps) => {
    console.log('rest: ', pageProps);

    const store = wrapper.useWrappedStore();

    return (
        <Provider store={store}>
            <h1>PageProps.id: {pageProps.id}</h1>
            <Component {...(pageProps as any)} />
        </Provider>
    );
};

MyApp.getInitialProps = wrapper.getInitialAppProps(store => async (appCtx): Promise<PageProps> => {
    // You have to do dispatches first, before...
    await store.dispatch(fetchSystem());

    // ...before calling (and awaiting!!!!) the children's getInitialProps
    // @see https://nextjs.org/docs/advanced-features/custom-app#caveats
    const childrenGip = await App.getInitialProps(appCtx);

    return {
        pageProps: {
            // And you have to spread the children's GIP result into pageProps
            // @see https://nextjs.org/docs/advanced-features/custom-app#caveats
            ...childrenGip.pageProps,
            id: 42,
        },
    };
});

export default MyApp;
