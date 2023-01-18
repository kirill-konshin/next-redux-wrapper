import React, {FC} from 'react';
import App, {AppProps} from 'next/app';
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

(MyApp as any).getInitialProps = wrapper.getInitialAppProps(store => async context => {
    // Keep in mind that this will be called twice on server, one for page and second for error page
    store.dispatch({type: 'APP', payload: 'was set in _app'});

    return {
        pageProps: {
            // https://nextjs.org/docs/advanced-features/custom-app#caveats
            ...(await App.getInitialProps(context)).pageProps,
            // Some custom thing for all pages
            appProp: context.ctx.pathname,
        },
    };
});

export default MyApp;
