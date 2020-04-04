import * as React from 'react';
import {Store, AnyAction, Action} from 'redux';
import {Provider} from 'react-redux';
import {GetServerSideProps, GetStaticProps, NextComponentType, NextPageContext} from 'next';
import App, {AppContext, AppInitialProps} from 'next/app';
import {IncomingMessage, ServerResponse} from 'http';
import {ParsedUrlQuery} from 'querystring';

export const HYDRATE = 'NEXT-REDUX-HYDRATE';

const getIsServer = () => typeof window === 'undefined';

const getDeserializedState = (initialState: any, {deserializeState}: Config = {}) =>
    deserializeState ? deserializeState(initialState) : initialState;

const getSerializedState = (state: any, {serializeState}: Config = {}) =>
    serializeState ? serializeState(state) : state;

const getStoreKey = ({storeKey}: Config = {}) => storeKey || '__NEXT_REDUX_STORE__';

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

    if (getIsServer()) return createStore();

    // Memoize store if client
    if (!(storeKey in window)) {
        (window as any)[storeKey] = createStore();
    }

    return (window as any)[storeKey];
};

// export interface GetProps {
//     (makeStore: MakeStore, callback?: (appCtx: AppContext) => any, config?: Config): (appCtx: AppContext) => any;
//     (makeStore: MakeStore, callback?: (ctx: NextPageContext) => any, config?: Config): (ctx: NextPageContext) => any;
//     (makeStore: MakeStore, callback?: GetServerSideProps, config?: Config): GetServerSideProps; //FIXME Types!
//     (makeStore: MakeStore, callback?: GetStaticProps, config?: Config): GetStaticProps; //FIXME Types!
// }

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
    }): Promise<WrappedAppProps> => {
        const store = initStore({context, makeStore, config});

        if (config.debug) console.log(`1. getProps created store with state`, store.getState());

        const isServer = getIsServer();

        const initialProps =
            (callback &&
                (await callback(
                    // merging store into context instead of just passing as another argument because it's impossible to override getInitialProps signature
                    isApp
                        ? {...context, ctx: {...(context as AppContext).ctx, store, isServer}}
                        : {...context, store, isServer},
                ))) ||
            {};

        if (config.debug) console.log(`3. getProps after dispatches has store state`, store.getState());

        const state = store.getState();
        return {
            isServer,
            initialProps,
            initialState: isServer ? getSerializedState(state, config) : state,
        };
    };

    const getInitialPageProps = <P extends {} = any>(
        callback?: (context: NextPageContext & {store: Store<S, A>}) => P | void,
    ) => async (context: NextPageContext) => {
        if (context.store) {
            console.warn('No need to wrap pages if _app was wrapped');
            return callback ? await callback(context as any) : null;
        }
        return await makeProps({callback, context});
    };

    const getInitialAppProps = <P extends {} = any>(
        callback?: (context: AppContext & {store: Store<S, A>}) => P | void,
    ) => async (context: AppContext) =>
        (await makeProps({callback, context, isApp: true})) as WrappedAppProps & AppInitialProps; // this is just to convince TS

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

        class WrappedComponentBase extends React.Component<WrappedAppProps> {
            public store: Store<S, A>;

            /* istanbul ignore next */
            public static displayName = `withRedux(${Component.displayName || Component.name || 'Component'})`;

            public constructor(props: WrappedAppProps, context: AppContext) {
                super(props, context);

                const {initialState} = props;

                if (config.debug)
                    console.log('4. WrappedApp.constructor created new store with initialState', initialState);

                this.store = initStore({makeStore, config, context});

                this.store.dispatch({
                    type: HYDRATE,
                    payload: getDeserializedState(initialState, config),
                } as any);
            }

            public render() {
                const {initialState, initialProps, isServer, ...props} = this.props;

                return (
                    <Provider store={this.store}>
                        {/* order is important! Next.js overwrites props from pages/_app with getStaticProps from page */}
                        {/* FIXME https://github.com/zeit/next.js/issues/11648 */}
                        <Component {...initialProps} {...props} />
                    </Provider>
                );
            }
        }

        return hasGetInitialProps
            ? class WrappedComponent extends WrappedComponentBase {
                  public static getInitialProps = async (...args: any) =>
                      Component.getInitialProps.call(Component, ...args);
              }
            : class WrappedComponent extends WrappedComponentBase {};
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

export interface WrappedAppProps {
    initialProps: any; // stuff returned from getInitialProps
    initialState: any; // stuff in the Store state after getInitialProps
    isServer: boolean;
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
