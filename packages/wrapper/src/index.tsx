import {AppContext, AppInitialProps} from 'next/app';
import {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {Store} from 'redux';
import {
    GetServerSideProps,
    GetServerSidePropsContext,
    GetStaticProps,
    GetStaticPropsContext,
    NextComponentType,
    NextPageContext,
} from 'next';
import {useDispatch} from 'react-redux';

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
export const RENDER = '__NEXT_REDUX_FIRST_RENDER__';

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
                req.__nextReduxWrapperStore = createStore(); // Used in GIP/GSSP
            }
            return req.__nextReduxWrapperStore;
        }
        return createStore();
    }

    // Memoize the store if we're on the client
    if (!sharedClientStore) {
        sharedClientStore = createStore();
    }

    return sharedClientStore;
};

export const createWrapper = <S extends Store>(makeStore: MakeStore<S>, config: Config<S> = {}) => {
    const makeProps = async ({callback, context}: {callback: Callback<S, any>; context: any}): Promise<WrapperProps> => {
        const store = initStore({context, makeStore});

        if (config.debug) {
            console.log(`1. getProps created store with state`, store.getState());
        }

        const nextCallback = callback && callback(store);
        const initialProps = (nextCallback && (await nextCallback(context))) || {};

        if (config.debug) {
            console.log(`2. getProps after dispatches has store state`, store.getState());
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
            return await makeProps({callback, context});
        };

    const getInitialAppProps =
        <P extends {} = any>(callback: AppCallback<S, P>): GetInitialAppProps<P> =>
        async (context: AppContext) => {
            const {initialProps, initialState} = await makeProps({callback, context});
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

    const useStore = () => useMemo<S>(() => initStore<S>({makeStore}), []);

    /**
     * Old notes about props
     *
     * If GSP has run, then gspState will _not_ contain the data from GIP (if it exists), because GSP is run at build time,
     * and GIP runs at request time. So we have to hydrate the GIP data first, and then do another hydrate on the gspState.
     * If GSSP has run, then gsspState _will_ contain the data from GIP (if there is a GIP) and the GSSP data combined
     * (see https://github.com/kirill-konshin/next-redux-wrapper/pull/499#discussion_r1014500941).
     * If there is no GSP or GSSP for this page, but there is a GIP on page level (not _app), then we use the gippState.
     * If there is no GSP or GSSP and no GIP on page level for this page, but there is a GIP on _app level, then we use the giapState.
     *
     * Hydration strategies
     *
     * useMemo so that when we navigate client side, we always synchronously hydrate the state before the new page
     * components are mounted. This means we hydrate while the previous page components are still mounted.
     * You might think that might cause issues because the selectors on the previous page (still mounted) will suddenly
     * contain other data, and maybe even nested properties, causing null reference exceptions.
     * But that's not the case.
     * Hydrating in useMemo will not trigger a rerender of the still mounted page component. So if your selectors do have
     * some initial state values causing them to rerun after hydration, and you're accessing deeply nested values inside your
     * components, you still wouldn't get errors, because there's no rerender.
     * Instead, React will render the new page components straight away, which will have selectors with the correct data.
     *
     * @param {any} initialState
     */
    const useHydration = ({initialState}: any) => {
        const dispatch = useDispatch();

        const [loading, setLoading] = useState(false);

        const hydrate = useCallback(
            (state: any) => {
                if (!state) {
                    return;
                }
                dispatch({
                    type: HYDRATE,
                    payload: getDeserializedState<S>(state, config),
                } as any);
            },
            [dispatch],
        );

        const loadingSelector = useCallback(
            (fn, defValue = null) => {
                if (loading) {
                    return () => defValue;
                }
                return fn;
            },
            [loading],
        );

        // This guard is solely to suppress Next.js warning about useless layout effect
        if (process.browser) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useLayoutEffect(() => {
                if (!(window as any)[RENDER]) {
                    (window as any)[RENDER] = true;
                    return;
                }

                setLoading(true);

                if (config.debug) {
                    console.log('3. useHydration effect', initialState);
                }

                hydrate(initialState);

                setLoading(false);

                return () => {
                    setLoading(true);
                };
            }, [hydrate, initialState]);

            if ((window as any)[RENDER]) {
                return {loading, loadingSelector};
            }
        }

        console.log('3. useHydration sync', initialState);

        // perform sync hydrate
        hydrate(initialState);

        return {loading, loadingSelector};
    };

    return {
        getServerSideProps,
        getStaticProps,
        getInitialAppProps,
        getInitialPageProps,
        useStore,
        useHydration,
    };
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

export type GetStaticPropsCallback<S extends Store, P extends {[key: string]: any}> = (store: S) => GetStaticProps<P>;
export type GetServerSidePropsCallback<S extends Store, P extends {[key: string]: any}> = (store: S) => GetServerSideProps<P>;
export type PageCallback<S extends Store, P> = (store: S) => GetInitialPageProps<P>;
export type AppCallback<S extends Store, P> = (store: S) => GetInitialAppProps<P>;
export type Callback<S extends Store, P extends {[key: string]: any}> =
    | GetStaticPropsCallback<S, P>
    | GetServerSidePropsCallback<S, P>
    | PageCallback<S, P>
    | AppCallback<S, P>;
