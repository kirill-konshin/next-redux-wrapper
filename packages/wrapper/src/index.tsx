import App, {AppContext, AppInitialProps} from 'next/app';
import React, {useEffect, useMemo, useRef} from 'react';
import {Provider} from 'react-redux';
import {Store} from 'redux';
import {
    GetServerSideProps,
    GetServerSidePropsContext,
    GetStaticProps,
    GetStaticPropsContext,
    NextComponentType,
    NextPageContext,
} from 'next';

/**
 * Quick note on Next.js return types:
 *
 * Page.getInitialProps https://nextjs.org/docs/api-reference/data-fetching/getInitialProps
 * as-is
 *
 * App.getInitialProps: AppInitialProps https://nextjs.org/docs/advanced-features/custom-app
 * {pageProps: any}
 *
 * getStaticProps https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation
 * {props: any}
 *
 * getServerSideProps https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering
 * {props: any}
 */

export const HYDRATE = '__NEXT_REDUX_WRAPPER_HYDRATE__';

const getIsServer = () => typeof window === 'undefined';

const getDeserializedState = <S extends Store>(initialState: any, {deserializeState}: Config<S> = {}) =>
    deserializeState ? deserializeState(initialState) : initialState;

const getSerializedState = <S extends Store>(state: any, {serializeState}: Config<S> = {}) =>
    serializeState ? serializeState(state) : state;

export declare type MakeStore<S extends Store> = (context: Context) => S;

export interface InitStoreOptions<S extends Store> {
    makeStore: MakeStore<S>;
    context?: Context;
}

let sharedClientStore: any;

const initStore = <S extends Store>({makeStore, context = {}}: InitStoreOptions<S>): S => {
    const createStore = () => makeStore(context);

    if (getIsServer()) {
        const req: any = (context as NextPageContext)?.req || (context as AppContext)?.ctx?.req;
        if (req) {
            // ATTENTION! THIS IS INTERNAL, DO NOT ACCESS DIRECTLY ANYWHERE ELSE
            // @see https://github.com/kirill-konshin/next-redux-wrapper/pull/196#issuecomment-611673546
            if (!req.__nextReduxWrapperStore) {
                req.__nextReduxWrapperStore = createStore();
            }
            return req.__nextReduxWrapperStore;
        }

        return createStore();
    }

    // Memoize store if client
    if (!sharedClientStore) {
        sharedClientStore = createStore();
    }

    return sharedClientStore;
};

export const createWrapper = <S extends Store>(makeStore: MakeStore<S>, config: Config<S> = {}) => {
    const makeProps = async ({
        callback,
        context,
        addStoreToContext = false,
    }: {
        callback: Callback<S, any>;
        context: any;
        addStoreToContext?: boolean;
    }): Promise<WrapperProps> => {
        const store = initStore({context, makeStore});

        if (config.debug) {
            console.log(`1. getProps created store with state`, store.getState());
        }

        // Legacy stuff - put store in context
        if (addStoreToContext) {
            if (context.ctx) {
                context.ctx.store = store;
            } else {
                context.store = store;
            }
        }

        const nextCallback = callback && callback(store);
        const initialProps = (nextCallback && (await nextCallback(context))) || {};

        if (config.debug) {
            console.log(`3. getProps after dispatches has store state`, store.getState());
        }

        const state = store.getState();

        return {
            initialProps,
            initialState: getIsServer() ? getSerializedState<S>(state, config) : state,
        };
    };

    const getInitialPageProps =
        <P extends {} = any>(callback: PageCallback<S, P>): GetInitialPageProps<P> =>
        async (
            context: NextPageContext | any, // legacy
        ) => {
            // context is store — avoid double-wrapping
            if ('getState' in context) {
                return callback && callback(context as any);
            }
            return makeProps({callback, context, addStoreToContext: true});
        };

    const getInitialAppProps =
        <P extends {} = any>(callback: AppCallback<S, P>): GetInitialAppProps<P> =>
        async (context: AppContext) => {
            const {initialProps, initialState} = await makeProps({callback, context, addStoreToContext: true});
            return {
                ...initialProps,
                initialState,
            };
        };

    const getStaticProps =
        <P extends {} = any>(callback: GetStaticPropsCallback<S, P>): GetStaticProps<P> =>
        async context => {
            const {initialProps, initialState} = await makeProps({callback, context});
            return {
                ...initialProps,
                props: {
                    ...initialProps.props,
                    initialState,
                },
            } as any;
        };

    const getServerSideProps =
        <P extends {} = any>(callback: GetServerSidePropsCallback<S, P>): GetServerSideProps<P> =>
        async context =>
            await getStaticProps(callback as any)(context); // just not to repeat myself

    const hydrate = (store: S, state: any) => {
        if (!state) {
            return;
        }
        store.dispatch({
            type: HYDRATE,
            payload: getDeserializedState<S>(state, config),
        } as any);
    };

    const useHybridHydrate = (store: S, state: any) => {
        const firstRender = useRef<boolean>(true);

        useEffect(() => {
            firstRender.current = false;
        }, []);

        useMemo(() => {
            // synchronous for server or first time render
            if (getIsServer() || firstRender.current) {
                hydrate(store, state);
            }
        }, [store, state]);

        useEffect(() => {
            // asynchronous for client subsequent navigation
            if (!getIsServer()) {
                hydrate(store, state);
            }
        }, [store, state]);
    };

    const useWrappedStore = ({initialState, initialProps, ...props}: any, displayName = 'useWrappedStore'): {store: S; props: any} => {
        // this happens when App has page with getServerSideProps/getStaticProps, initialState will be dumped twice:
        // one incomplete and one complete
        const initialStateFromGSPorGSSR = props?.pageProps?.initialState;

        if (config.debug) {
            console.log('4.', displayName, 'created new store with', {
                initialState,
                initialStateFromGSPorGSSR,
            });
        }

        const store = useMemo<S>(() => initStore<S>({makeStore}), []);

        useHybridHydrate(store, initialState);
        useHybridHydrate(store, initialStateFromGSPorGSSR);

        let resultProps: any = props;

        // order is important! Next.js overwrites props from pages/_app with getStaticProps from page
        // @see https://github.com/zeit/next.js/issues/11648
        if (initialProps && initialProps.pageProps) {
            resultProps.pageProps = {
                ...initialProps.pageProps, // this comes from wrapper in _app mode
                ...props.pageProps, // this comes from gssp/gsp in _app mode
            };
        }

        // just some cleanup to prevent passing it as props, we need to clone props to safely delete initialState
        if (initialStateFromGSPorGSSR) {
            resultProps = {...props, pageProps: {...props.pageProps}};
            delete resultProps.pageProps.initialState;
        }

        // unwrap getInitialPageProps
        if (resultProps?.pageProps?.initialProps) {
            resultProps.pageProps = {...resultProps.pageProps, ...resultProps.pageProps.initialProps};
            delete resultProps.pageProps.initialProps;
        }

        return {store, props: {...initialProps, ...resultProps}};
    };

    const withRedux = (Component: NextComponentType | App | any) => {
        console.warn(
            '/!\\ You are using legacy implementaion. Please update your code: use createWrapper() and wrapper.useWrappedStore().',
        );

        //TODO Check if pages/_app was wrapped so there's no need to wrap a page itself
        const WrappedComponent = (props: any) => {
            const {store, props: combinedProps} = useWrappedStore(props, WrappedComponent.displayName);

            return (
                <Provider store={store}>
                    <Component {...combinedProps} />
                </Provider>
            );
        };

        WrappedComponent.displayName = `withRedux(${Component.displayName || Component.name || 'Component'})`;

        if ('getInitialProps' in Component) {
            WrappedComponent.getInitialProps = Component.getInitialProps;
        }

        return WrappedComponent;
    };

    return {
        getServerSideProps,
        getStaticProps,
        getInitialAppProps,
        getInitialPageProps,
        withRedux,
        useWrappedStore,
    };
};

// Legacy
export default <S extends Store>(makeStore: MakeStore<S>, config: Config<S> = {}) => {
    console.warn('/!\\ You are using legacy implementaion. Please update your code: use createWrapper() and wrapper.withRedux().');
    return createWrapper(makeStore, config).withRedux;
};

export type Context = NextPageContext | AppContext | GetStaticPropsContext | GetServerSidePropsContext;

export interface Config<S extends Store> {
    serializeState?: (state: ReturnType<S['getState']>) => any;
    deserializeState?: (state: any) => ReturnType<S['getState']>;
    debug?: boolean;
}

export interface WrapperProps {
    initialProps: any; // stuff returned from getInitialProps or getServerSideProps
    initialState: any; // stuff in the Store state after getInitialProps
}

type GetInitialPageProps<P> = NextComponentType<NextPageContext, any, P>['getInitialProps'];

//FIXME Could be typeof App.getInitialProps & appGetInitialProps (not exported), see https://github.com/kirill-konshin/next-redux-wrapper/issues/412
type GetInitialAppProps<P> = ({Component, ctx}: AppContext) => Promise<AppInitialProps & {pageProps: P}>;

export type GetStaticPropsCallback<S extends Store, P> = (store: S) => GetStaticProps<P>;
export type GetServerSidePropsCallback<S extends Store, P> = (store: S) => GetServerSideProps<P>;
export type PageCallback<S extends Store, P> = (store: S) => GetInitialPageProps<P>;
export type AppCallback<S extends Store, P> = (store: S) => GetInitialAppProps<P>;
export type Callback<S extends Store, P> =
    | GetStaticPropsCallback<S, P>
    | GetServerSidePropsCallback<S, P>
    | PageCallback<S, P>
    | AppCallback<S, P>;

declare module 'next' {
    export interface NextPageContext<S extends Store = any> {
        //<S = any, A extends Action = AnyAction>
        /**
         * Provided by next-redux-wrapper: The redux store
         */
        store: S;
    }
}
