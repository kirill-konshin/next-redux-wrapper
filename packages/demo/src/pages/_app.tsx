import React from 'react';
import App, {AppInitialProps, AppContext} from 'next/app';
import {wrapper} from '../components/store';

class WrappedApp extends App<AppInitialProps> {
    public static getInitialProps = async ({Component, ctx}: AppContext) => {
        // Keep in mind that this will be called twice on server, one for page and second for error page
        ctx.store.dispatch({type: 'APP', payload: 'was set in _app'});

        return {
            pageProps: {
                // Call page-level getInitialProps
                ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
                // Some custom thing for all pages
                appProp: ctx.pathname,
            },
        };
    };

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
