import React, {Component} from "react";

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

    let {req} = ctx;
    const isServer = !!req || typeof window === 'undefined';
    const {storeKey} = config;

    const options = {
        ...ctx,
        ...config,
        isServer
    };

    // Always make a new store if server
    if (isServer) {
        req = req || {}; // TODO Make an issue for this case, req should always be present
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

    config = {
        storeKey: DEFAULT_KEY,
        debug: _debug,
        serializeState: state => state,
        deserializeState: state => state,
        ...config
    };

    return (App) => (class WrappedApp extends Component {

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
                initialState: config.serializeState(store.getState()),
                initialProps: initialProps
            };
        };

        render() {

            let {initialState, initialProps, store, isServer, ...props} = this.props;

            const hasStore = store && ('dispatch' in store) && ('getState' in store);

            store = hasStore ? store : initStore(
                createStore,
                config.deserializeState(initialState),
                {},
                config
            ); // client case, no store but has initialState

            if (config.debug) console.log('4. WrappedApp.render', (hasStore ? 'picked up existing one,' : 'created new store with'), 'initialState', initialState);

            // Cmp render must return something like <Provider><Component/></Provider>
            return (
                <App {...props} {...initialProps} store={store} isServer={isServer}/>
            );

        }

    });

};