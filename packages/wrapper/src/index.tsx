import React, {Component} from 'react';
import {Store, AnyAction, Action} from 'redux';
import {NextComponentType, NextContext} from 'next';
import {NextAppContext} from 'next/app';

const defaultConfig: Config = {
    storeKey: '__NEXT_REDUX_STORE__',
    debug: false,
    serializeState: state => state,
    deserializeState: state => state,
};

export default (makeStore: MakeStore, config?: Config) => {
    config = {
        ...defaultConfig,
        ...config,
    };

    const isServer = typeof window === 'undefined';

    const initStore = ({initialState, ctx}: InitStoreOptions): Store => {
        const {storeKey} = config;

        const createStore = () =>
            makeStore(config.deserializeState(initialState), {
                ...ctx,
                ...config,
                isServer,
            });

        if (isServer) return createStore();

        // Memoize store if client
        if (!window.hasOwnProperty(storeKey)) {
            window[storeKey] = createStore();
        }

        return window[storeKey];
    };

    return (App: NextComponentType | any) =>
        class WrappedApp extends Component<WrappedAppProps> {
            /* istanbul ignore next */
            public static displayName = `withRedux(${App.displayName || App.name || 'App'})`;

            public static getInitialProps = async (appCtx: NextJSAppContext) => {
                /* istanbul ignore next */
                if (!appCtx) throw new Error('No app context');
                /* istanbul ignore next */
                if (!appCtx.ctx) throw new Error('No page context');

                const store = initStore({
                    ctx: appCtx.ctx,
                });

                if (config.debug)
                    console.log('1. WrappedApp.getInitialProps wrapper got the store with state', store.getState());

                appCtx.ctx.store = store;
                appCtx.ctx.isServer = isServer;

                let initialProps = {};

                if ('getInitialProps' in App) {
                    initialProps = await App.getInitialProps.call(App, appCtx);
                }

                if (config.debug) console.log('3. WrappedApp.getInitialProps has store state', store.getState());

                return {
                    isServer,
                    initialState: config.serializeState(store.getState()),
                    initialProps,
                };
            };

            public constructor(props, context) {
                super(props, context);

                const {initialState} = props;

                if (config.debug) console.log('4. WrappedApp.render created new store with initialState', initialState);

                this.store = initStore({
                    initialState,
                });
            }

            protected store: Store;

            public render() {
                const {initialProps, initialState, ...props} = this.props;

                // Cmp render must return something like <Provider><Component/></Provider>
                return <App {...props} {...initialProps} store={this.store} />;
            }
        };
};

export interface Config {
    serializeState?: (any) => any;
    deserializeState?: (any) => any;
    storeKey?: string;
    debug?: boolean;
    overrideIsServer?: boolean;
}

export interface NextJSContext<S = any, A extends Action = AnyAction> extends NextContext {
    store: Store<S, A>;
    isServer: boolean;
}

export interface NextJSAppContext extends NextAppContext {
    ctx: NextJSContext;
}

export interface MakeStoreOptions extends Config, NextJSContext {
    isServer: boolean;
}

export declare type MakeStore = (initialState: any, options: MakeStoreOptions) => Store;

export interface InitStoreOptions {
    initialState?: any;
    ctx?: NextJSContext;
}

export interface WrappedAppProps {
    initialProps: any; // stuff returned from getInitialProps
    initialState: any; // stuff in the Store state after getInitialProps
    isServer: boolean;
}

export interface AppProps {
    store: Store;
}
