import React from 'react';
import {Provider} from 'react-redux';
import App, {AppProps} from 'next/app';
import {fetchSystem, wrapper} from '../store';

interface PageProps {
    pageProps: {
        id: number;
    };
}

const MyApp = ({Component, ...rest}: Omit<AppProps, 'pageProps'> & PageProps) => {
    console.log('rest: ', rest);
    const {store, props} = wrapper.useWrappedStore(rest);

    return (
        <Provider store={store}>
            <h1>PageProps.id: {rest.pageProps.id}</h1>
            <Component {...props.pageProps} />
        </Provider>
    );
};

MyApp.getInitialProps = wrapper.getInitialAppProps(store => async (appCtx): Promise<PageProps> => {
    // You have to do dispatches first, before...
    await store.dispatch(fetchSystem());

    // ...before calling (and awaiting!!!!) the children's getInitialProps
    const childrenGip = await App.getInitialProps(appCtx);
    return {
        pageProps: {
            // And you have to spread the children's GIP result into pageProps
            ...childrenGip.pageProps,
            id: 42,
        },
    };
});

export default MyApp;
