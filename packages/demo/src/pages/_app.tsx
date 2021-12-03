import React from 'react';
import App, {AppProps} from 'next/app';
import {wrapper} from '../components/store';

class MyApp extends React.Component<AppProps> {
    public static getInitialProps = wrapper.getInitialAppProps(store => async context => {
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

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(MyApp);
