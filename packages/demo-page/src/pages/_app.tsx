import React from 'react';
import App, {AppInitialProps} from 'next/app';
import {wrapper} from '../components/store';

class WrappedApp extends App<AppInitialProps> {
    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
