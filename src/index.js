import React from "react";
import {Provider} from "react-redux";
import BaseApp, {Container} from "next/app";

let _Promise = Promise;
let _debug = false;
const DEFAULT_KEY = '__NEXT_REDUX_STORE__';

export const setPromise = Promise => _Promise = Promise;

/**
 * @param makeStore
 * @param initialState
 * @param ctx
 * @param config
 * @return {{getState: function, dispatch: function}}
 */
const initStore = (makeStore, initialState, ctx, config) => {

    const {req} = ctx;
    const isServer = !!req;
    const {storeKey} = config;

    const options = {
        ...ctx,
        ...config,
        isServer
    };

    // Always make a new store if server
    if (isServer) {
        if (!req._store) req._store = makeStore(initialState, options); // page and error should share one store
        return req._store;
    }

    // Memoize store if client
    if (!window[storeKey]) {
        window[storeKey] = makeStore(initialState, options);
    }

    return window[storeKey];

};

/**
 * @param createStore
 * @param config
 * @return {function(App): {getInitialProps, new(): WrappedApp, prototype: WrappedApp}}
 */
export default (createStore, config = {}) => {

    config = {storeKey: DEFAULT_KEY, debug: _debug, ...config};

    return (App) => (class WrappedApp extends BaseApp {

        static displayName = `withRedux(${App.displayName || App.name || 'App'})`;

        static getInitialProps = async (appCtx = {}) => {

            const {ctx: {req} = {}, ctx = {}} = appCtx;

            const isServer = !!req;

            const store = initStore(
                createStore,
                undefined /** initialState **/,
                ctx,
                config
            );

            if (config.debug) console.log('1. WrappedApp.getInitialProps wrapper got the store with state', store.getState());

            const initialProps = (App.getInitialProps ? await App.getInitialProps.call(App, {
                ...appCtx,
                ctx: {
                    ...ctx,
                    store,
                    isServer
                }
            }) : {});

            if (config.debug) console.log('3. WrappedApp.getInitialProps has store state', store.getState());

            return {
                isServer,
                store,
                initialState: store.getState(),
                initialProps: initialProps
            };
        };

        render() {

            let {initialState, initialProps, store, isServer, ...props} = this.props;

            const hasStore = store && ('dispatch' in store) && ('getState' in store);

            store = hasStore ? store : initStore(createStore, initialState, {}, config); // client case, no store but has initialState

            if (config.debug) console.log('4. WrappedApp.render', (hasStore ? 'picked up existing one,' : 'created new store with'), 'initialState', initialState);

            // <Container> must be on top of hierarchy for HMR to work
            // Cmp render must return something like <Component/>
            return (
                <Container>
                    <Provider store={store}>
                        <App {...initialProps} {...props} store={store} isServer={isServer}/>
                    </Provider>
                </Container>
            );

        }

    });

};