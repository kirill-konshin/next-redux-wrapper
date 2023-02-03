import React, {FC} from 'react';
import {Provider} from 'react-redux';
import App, {AppProps} from 'next/app';
import {fetchSystem, wrapper} from '../store';

const MyApp: FC<AppProps> = function MyApp({Component, pageProps}) {
    console.log('rest: ', pageProps);

    const store = wrapper.useStore();

    return (
        <Provider store={store}>
            <h1>PageProps.id: {pageProps.id}</h1>
            <Component {...pageProps} />
        </Provider>
    );
};

//FIXME This is not a recommended approach, only used here for demo purposes
(MyApp as any).getInitialProps = wrapper.getInitialAppProps(store => async appCtx => {
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
