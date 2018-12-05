import React, {Component} from "react";

let _debug = false;
const DEFAULT_KEY = '__NEXT_REDUX_STORE__';
const isServer = typeof window === 'undefined';

/**
 * @param makeStore
 * @param initialState
 * @param config
 * @param ctx
 * @return {{getState: function, dispatch: function}}
 */
const initStore = ({makeStore, initialState, config, ctx = {}}) => {

    const {storeKey} = config;

    const createStore = () => makeStore(
        config.deserializeState(initialState),
        {
            ...ctx,
            ...config,
            isServer
        }
    );

    if (isServer) return createStore();

    // Memoize store if client
    if (!window[storeKey]) {
        window[storeKey] = createStore();
    }

    return window[storeKey];

};

/**
 * @param makeStore
 * @param config
 * @return {function(App): {getInitialProps, new(): WrappedApp, prototype: WrappedApp}}
 */
export default (makeStore, config = {}) => {

    config = {
        storeKey: DEFAULT_KEY,
        debug: _debug,
        serializeState: state => state,
        deserializeState: state => state,
        ...config
    };

    return (App) => (class WrappedApp extends Component {

        static displayName = `withRedux(${App.displayName || App.name || 'App'})`;

        static getInitialProps = async (appCtx) => {

            if (!appCtx) throw new Error('No app context');
            if (!appCtx.ctx) throw new Error('No page context');

            const store = initStore({
                makeStore,
                config,
                ctx: appCtx.ctx
            });

            if (config.debug) console.log('1. WrappedApp.getInitialProps wrapper got the store with state', store.getState());

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
                initialProps: initialProps
            };

        };

        constructor(props, context) {

            super(props, context);

            const {initialState} = props;

            if (config.debug) console.log('4. WrappedApp.render created new store with initialState', initialState);

            this.store = initStore({
                makeStore,
                initialState,
                config
            });

        }

        render() {

            let {initialProps, initialState, ...props} = this.props;

            // Cmp render must return something like <Provider><Component/></Provider>
            return (
                <App {...props} {...initialProps} store={this.store}/>
            );

        }

    });

};