import * as React from 'react';
import {Store, AnyAction, Action} from 'redux';
import {NextComponentType, NextPageContext} from 'next';
import {AppContext, AppProps} from 'next/app';

const defaultConfig = {
    storeKey: '__NEXT_REDUX_STORE__',
    debug: false,
    serializeState: (state: any) => state,
    deserializeState: (state: any) => state,
};

export default (makeStore: MakeStore, config?: Config) => {
    const defaultedConfig = {
        ...defaultConfig,
        ...config,
    };

    const isServer = typeof window === 'undefined';

    const initStore = ({initialState, ctx}: InitStoreOptions): Store => {
        const {storeKey} = defaultedConfig;

        const createStore = () =>
            makeStore(defaultedConfig.deserializeState(initialState), {
                ...ctx,
                ...config,
                isServer,
            });

        if (isServer) return createStore();

        // Memoize store if client
        if (!(storeKey in window)) {
            (window as any)[storeKey] = createStore();
        }

        return (window as any)[storeKey];
    };

    return (App: NextComponentType | any) =>
        class WrappedApp extends React.Component<WrappedAppProps> {
            /* istanbul ignore next */
            public static displayName = `withRedux(${App.displayName || App.name || 'App'})`;

            public static getInitialProps = async (appCtx: AppContext) => {
                /* istanbul ignore next */
                if (!appCtx) throw new Error('No app context');
                /* istanbul ignore next */
                if (!appCtx.ctx) throw new Error('No page context');

                const store = initStore({
                    ctx: appCtx.ctx,
                });

                if (defaultedConfig.debug)
                    console.log('1. WrappedApp.getInitialProps wrapper got the store with state', store.getState());

                appCtx.ctx.store = store;
                appCtx.ctx.isServer = isServer;

                let initialProps = {};

                if ('getInitialProps' in App) {
                    initialProps = await App.getInitialProps.call(App, appCtx);
                }

                if (defaultedConfig.debug)
                    console.log('3. WrappedApp.getInitialProps has store state', store.getState());

                return {
                    isServer,
                    initialState: isServer ? defaultedConfig.serializeState(store.getState()) : store.getState(),
                    initialProps,
                };
            };

            public constructor(props: WrappedAppProps, context: AppContext) {
                super(props, context);

                const {initialState} = props;

                if (defaultedConfig.debug)
                    console.log('4. WrappedApp.render created new store with initialState', initialState);

                this.store = initStore({
                    ctx: context.ctx,
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
    serializeState?: (state: any) => any;
    deserializeState?: (state: any) => any;
    storeKey?: string;
    debug?: boolean;
    overrideIsServer?: boolean;
}

export type MakeStoreOptions = Config & NextPageContext;

export declare type MakeStore = (initialState: any, options: MakeStoreOptions) => Store;

export interface InitStoreOptions {
    initialState?: any;
    ctx: NextPageContext;
}

export interface WrappedAppProps {
    initialProps: any; // stuff returned from getInitialProps
    initialState: any; // stuff in the Store state after getInitialProps
    isServer: boolean;
}

/**
 * Convenience type that adds the Redux store provided by `next-redux-wrapper` to the props of a
 * wrapped `App` component.
 *
 * Usage example (within `_app.js`):
 * ```
 * class MyApp extends App<ReduxWrappedAppProps> {
 * ```
 * or, if you want to provide custom state and action types for the store:
 * ```
 * class MyApp extends App<ReduxWrappedAppProps<MyStateType, MyActionType>> {
 * ```
 *
 * You can also add custom `App` props via the third type argument.
 */
export interface ReduxWrapperAppProps<S = any, A extends Action = AnyAction, P = {}> extends AppProps<P> {
    store: Store<S, A>;
}

declare module 'next/dist/next-server/lib/utils' {
    export interface NextPageContext<S = any, A extends Action = AnyAction> {
        /**
         * Provided by next-redux-wrapper: Whether the code is executed on the server or the client side
         */
        isServer: boolean;

        /**
         * Provided by next-redux-wrapper: The redux store
         */
        store: Store<S, A>;
    }
}

//FIXME Backwards compatibility, to be removed in next versions
export interface NextJSContext<S, A extends Action = AnyAction> extends NextPageContext<S, A> {}
export interface NextJSAppContext extends AppContext {}
