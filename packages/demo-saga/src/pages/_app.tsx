import React from 'react';
import App, {AppProps} from 'next/app';
import {END} from 'redux-saga';
import {SagaStore, wrapper} from '../components/store';

class MyApp extends React.Component<AppProps> {
    public static getInitialProps = wrapper.getInitialAppProps(store => async context => {
        // 1. Wait for all page actions to dispatch
        const pageProps = {
            // https://nextjs.org/docs/advanced-features/custom-app#caveats
            ...(await App.getInitialProps(context)).pageProps,
        };

        // 2. Stop the saga if on server
        if (context.ctx.req) {
            store.dispatch(END);
            await (store as SagaStore).sagaTask.toPromise();
        }

        // 3. Return props
        return {pageProps};
    });

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(MyApp);
