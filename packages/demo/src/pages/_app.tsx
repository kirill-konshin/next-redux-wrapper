import React from 'react';
import App, {AppInitialProps, AppContext} from 'next/app';
import {wrapper} from '../components/store';
import {State} from '../components/reducer';
import {Store} from 'redux';

declare module 'next/dist/next-server/lib/utils' {
    export interface NextPageContext {
        store: Store<State>;
    }
}

class WrappedApp extends App<AppInitialProps> {
    public static getInitialProps = (context: any) => {
        const props = wrapper.getInitialAppProps(store => async ({Component, ctx}: AppContext) => {
            // Keep in mind that this will be called twice on server, one for page and second for error page
            store.dispatch({type: 'APP', payload: 'was set in _app'});

            return {
                pageProps: {
                    // Call page-level getInitialProps
                    ...(Component.getInitialProps ? await Component.getInitialProps({...ctx, store}) : {}),
                    // Some custom thing for all pages
                    appProp: ctx.pathname,
                },
            };
        })(context);
        console.log({props, context});
        return props;
    };

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
