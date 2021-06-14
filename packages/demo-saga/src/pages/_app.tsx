import React from 'react';
import App, {AppContext, AppInitialProps} from 'next/app';
import {wrapper} from '../components/store';

class WrappedApp extends App<AppInitialProps> {
    public static getInitialProps = wrapper.getInitialAppProps(store => async ({Component, ctx}: AppContext) => {
        return {
            pageProps: Component.getInitialProps ? await Component.getInitialProps(ctx) : {},
        };
    });

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
