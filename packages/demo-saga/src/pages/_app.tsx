import React from 'react';
import App, {AppContext, AppInitialProps} from 'next/app';
import {END} from 'redux-saga';
import {SagaStore, makeStore} from '../components/store';
import withRedux from 'next-redux-wrapper';

class WrappedApp extends App<AppInitialProps> {
    public static getInitialProps = async ({Component, ctx}: AppContext) => {
        // 1. Wait for all page actions to dispatch
        const pageProps = {
            ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
        };

        // 2. Stop the saga if on server
        if (ctx.req) {
            console.log('Saga is executing on server, we will wait');
            ctx.store.dispatch(END);
            await (ctx.store as SagaStore).sagaTask.toPromise();
        }

        // 3. Return props
        return {
            pageProps,
        };
    };

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default withRedux(makeStore)(WrappedApp);
