import * as React from 'react';
import {Store, AnyAction, Action} from 'redux';
import {Provider} from 'react-redux';
import {GetServerSideProps, GetStaticProps, NextComponentType, NextPageContext} from 'next';
import App, {AppContext, AppInitialProps} from 'next/app';
import {IncomingMessage, ServerResponse} from 'http';
import {ParsedUrlQuery} from 'querystring';

export const HYDRATE = '__NEXT_REDUX_WRAPPER_HYDRATE__';
export const STOREKEY = '__NEXT_REDUX_WRAPPER_STORE__';

const getIsServer = () => typeof window === 'undefined';

const getDeserializedState = (initialState: any, {deserializeState}: Config = {}) =>
    deserializeState ? deserializeState(initialState) : initialState;

const getSerializedState = (state: any, {serializeState}: Config = {}) =>
    serializeState ? serializeState(state) : state;

const getStoreKey = ({storeKey}: Config = {}) => storeKey || STOREKEY;

export declare type MakeStore<S = any, A extends Action = AnyAction> = (context: Context) => Store<S, A>;

export interface InitStoreOptions<S = any, A extends Action = AnyAction> {
    makeStore: MakeStore<S, A>;
    context: Context;
    config: Config;
}

const initStore = <S extends {} = any, A extends Action = AnyAction>({
    makeStore,
    context,
    config,
}: InitStoreOptions<S, A>): Store<S, A> => {
    const storeKey = getStoreKey(config);

    const createStore = () => makeStore(context);

    if (getIsServer()) {
        const c = context as any;
        let req;
        if (c.req) req = c.req;
        if (c.ctx && c.ctx.req) req = c.ctx.req;
        if (req) {
            // ATTENTION! THIS IS INTERNAL, DO NOT ACCESS DIRECTLY ANYWHERE ELSE
            // @see https://github.com/kirill-konshin/next-redux-wrapper/pull/196#issuecomment-611673546
            if (!req.__nextReduxWrapperStore) req.__nextReduxWrapperStore = createStore();
            return req.__nextReduxWrapperStore;
        }
        return createStore();
    }

    // Memoize store if client
    if (!(storeKey in window)) {
        (window as any)[storeKey] = createStore();
    }

    return (window as any)[storeKey];
};

//FIXME Use Parameters<GetServerSideProps>, see https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterst
export interface GetServerSidePropsContext {
    req: IncomingMessage;
    res: ServerResponse;
    params?: ParsedUrlQuery;
    query: ParsedUrlQuery;
    preview?: boolean;
    previewData?: any;
}

//FIXME Use Parameters<GetStaticProps>, see https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterst
export interface GetStaticPropsContext {
    params?: ParsedUrlQuery;
    preview?: boolean;
    previewData?: any;
}

export const createWrapper = <S extends {} = any, A extends Action = AnyAction>(
    makeStore: MakeStore<S, A>,
    config: Config = {},
) => {
    const makeProps = async ({
        callback,
        context,
        isApp = false,
    }: {
        callback: any;
        context: Context;
        isApp?: boolean;
    }): Promise<WrapperProps> => {
        const store = initStore({context, makeStore, config});

        if (config.debug) console.log(`1. getProps created store with state`, store.getState());

        const initialProps =
            (callback &&
                (await callback(
                    // merging store into context instead of just passing as another argument because it's impossible to override getInitialProps signature
                    isApp ? {...context, ctx: {...(context as AppContext).ctx, store}} : {...context, store},
                ))) ||
            {};

        if (config.debug) console.log(`3. getProps after dispatches has store state`, store.getState());

        const state = store.getState();

        return {
            initialProps,
            initialState: getIsServer() ? getSerializedState(state, config) : state,
        };
    };

    const getInitialPageProps = <P extends {} = any>(
        callback?: (context: NextPageContext & {store: Store<S, A>}) => P | void,
    ) => async (context: NextPageContext) => {
        if (context.store) {
            console.warn('No need to wrap pages if _app was wrapped');
            return callback ? await callback(context as any) : undefined;
        }
        return await makeProps({callback, context});
    };

    const getInitialAppProps = <P extends {} = any>(
        callback?: (context: AppContext & {store: Store<S, A>}) => P | void,
    ) => async (context: AppContext) =>
        (await makeProps({callback, context, isApp: true})) as WrapperProps & AppInitialProps; // this is just to convince TS

    const getStaticProps = <P extends {} = any>(
        callback?: (context: GetStaticPropsContext & {store: Store<S, A>}) => P | void,
    ): GetStaticProps<P> => async (context: any) => {
        const {
            initialProps: {props, ...settings},
            ...wrapperProps
        } = await makeProps({callback, context});

        return {
            ...settings,
            props: {
                ...wrapperProps,
                ...props,
            },
        } as any;
    };

    const getServerSideProps = <P extends {} = any>(
        callback?: (context: GetServerSidePropsContext & {store: Store<S, A>}) => P | void,
    ): GetServerSideProps<P> => getStaticProps<P>(callback as any) as any; // just not to repeat myself

    const withRedux = (Component: NextComponentType | App | any) => {
        const hasGetInitialProps = 'getInitialProps' in Component;
        const displayName = `withRedux(${Component.displayName || Component.name || 'Component'})`;

        class Wrapper extends React.Component<WrapperProps> {
            public store: Store<S, A>;

            public constructor(props: WrapperProps, context: AppContext) {
                super(props, context);

                const {initialState} = props;

                if (config.debug)
                    console.log('4. WrappedApp.constructor created new store with initialState', initialState);

                //TODO Check if pages/_app was wrapped and there's no need to wrap a page itself
                this.store = initStore({makeStore, config, context});

                this.store.dispatch({
                    type: HYDRATE,
                    payload: getDeserializedState(
                        // this happens when App has page with getServerSideProps
                        // ATTENTION! This code assumes that Page's getServerSideProps is executed after App.getInitialProps
                        props?.pageProps?.initialState ?? initialState,
                        config,
                    ),
                } as any);
            }

            public render() {
                const {initialState, initialProps, ...props} = this.props as any;

                // order is important! Next.js overwrites props from pages/_app with getStaticProps from page
                // @see https://github.com/zeit/next.js/issues/11648
                if (initialProps && initialProps.pageProps)
                    props.pageProps = {
                        ...initialProps.pageProps, // this comes from wrapper in _app mode
                        ...props.pageProps, // this comes from gssp/gsp in _app mode
                    };

                if (props.pageProps) {
                    // this happens when App has page with getServerSideProps
                    // just some cleanup here
                    delete props.pageProps.initialState;
                }

                return (
                    <Provider store={this.store}>
                        <Component {...initialProps} {...props} />
                    </Provider>
                );
            }
        }

        return hasGetInitialProps
            ? class WrappedPage extends Wrapper {
                  public static displayName = displayName;
                  public static getInitialProps = async (...args: any) =>
                      Component.getInitialProps.call(Component, ...args);
              }
            : class WrappedApp extends Wrapper {
                  public static displayName = displayName;
              };
    };

    return {
        getInitialAppProps,
        getInitialPageProps,
        getServerSideProps,
        getStaticProps,
        withRedux,
    };
};

export type Context = NextPageContext | AppContext | GetStaticPropsContext | GetServerSidePropsContext;

export interface Config {
    serializeState?: (state: any) => any;
    deserializeState?: (state: any) => any;
    storeKey?: string;
    debug?: boolean;
}

export interface WrapperProps {
    initialProps: any; // stuff returned from getInitialProps
    initialState: any; // stuff in the Store state after getInitialProps
    pageProps?: any; // stuff from page's getServerSideProps or getInitialProps when used with App
}

declare module 'next/dist/next-server/lib/utils' {
    export interface NextPageContext<S = any, A extends Action = AnyAction> {
        /**
         * Provided by next-redux-wrapper: The redux store
         */
        store: Store<S, A>;
    }
}
