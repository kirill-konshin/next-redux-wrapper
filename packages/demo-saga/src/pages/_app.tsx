import React from 'react';
import App, {AppInitialProps} from 'next/app';
import {END} from 'redux-saga';
import {SagaStore, wrapper} from '../components/store';

class WrappedApp extends App<AppInitialProps> {
    public static getInitialProps = wrapper.getInitialAppProps<Promise<AppInitialProps>>(async ({Component, ctx}) => {
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
    });

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
