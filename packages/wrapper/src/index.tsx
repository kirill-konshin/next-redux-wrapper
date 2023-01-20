import {AppContext} from 'next/app';
import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
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
export const STATE = '__NEXT_REDUX_STATE__';

const getIsServer = () => !process.browser;

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

export const getStates = ({initialStateGSSP, initialStateGSP, initialStateGIAP, initialStateGIPP}: PageProps) => {
    if (initialStateGIAP) {
        if (initialStateGIPP) {
            return [[initialStateGIAP, 'GIAP']]; // ignore GIPP as GIAP is more complete
        } else if (initialStateGSSP) {
            return [[initialStateGSSP, 'GSSP']]; // ignore GIAP as GSSP is more complete
        } else if (initialStateGSP) {
            return [
                // send both as they both are partial
                [initialStateGSP, 'GSP'],
                [initialStateGIAP, 'GIAP'],
            ];
        }
        return [[initialStateGIAP, 'GIAP']];
    } else if (initialStateGSP) {
        return [[initialStateGSP, 'GSP']];
    } else if (initialStateGSSP) {
        return [[initialStateGSSP, 'GSSP']];
    } else if (initialStateGIPP) {
        return [[initialStateGIPP, 'GIPP']];
    }
    return [];
};

export const createWrapper = <S extends Store>(makeStore: MakeStore<S>, config: Config<S> = {}) => {
    const makeProps = async function <P>({callback, context}: {callback: Callback<S, P>; context: any}): Promise<WrapperProps<any>> {
        const store = initStore({context, makeStore});

        const nextCallback = callback && callback(store);
        const initialProps = ((nextCallback && (await nextCallback(context))) || {}) as P;

        if (config.debug) {
            console.log(`2. getProps after dispatches has store state`, store.getState());
        }

        const state = store.getState();

        return {
            initialProps,
            initialState: getIsServer() ? getSerializedState<S>(state, config) : state,
        } as any;
    };

    const getInitialPageProps =
        <P extends {} = any>(callback: PageCallback<S, P>): ReturnType<PageCallback<S, P>> =>
        async (
            context: NextPageContext | any, // legacy
        ) => {
            //TODO Check context props to ensure GIPP
            const {initialState, initialProps} = await makeProps({callback, context});
            return {
                ...initialProps,
                initialStateGIPP: initialState,
            };
        };

    const getInitialAppProps =
        <P extends {} = any>(callback: AppCallback<S, P>): ReturnType<AppCallback<S, P>> =>
        async (context: AppContext) => {
            //TODO Check context props to ensure GIAP
            const {initialState, initialProps} = await makeProps({callback, context} as any);
            return {
                ...initialProps,
                pageProps: {
                    ...initialProps.pageProps,
                    initialStateGIAP: initialState,
                },
            };
        };

    const getStaticProps =
        <P extends {} = any>(callback: GetStaticPropsCallback<S, P>): ReturnType<GetStaticPropsCallback<S, P>> =>
        async context => {
            //TODO Check context props to ensure GSP
            const {initialState, initialProps} = await makeProps({callback, context});
            return {
                ...initialProps,
                props: {
                    ...initialProps.props,
                    initialStateGSP: initialState,
                },
            } as any;
        };

    const getServerSideProps =
        <P extends {} = any>(callback: GetServerSidePropsCallback<S, P>): ReturnType<GetServerSidePropsCallback<S, P>> =>
        async context => {
            //TODO Check context props to ensure GSSP
            const {initialState, initialProps} = await makeProps({callback, context});
            return {
                ...initialProps,
                props: {
                    ...initialProps.props,
                    initialStateGSSP: initialState,
                },
            } as any;
        };

    const useStore = () => useMemo<S>(() => initStore<S>({makeStore}), []);

    /**
     * Old notes about props
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
     */
    const useHydration = ({initialStateGSSP, initialStateGSP, initialStateGIAP, initialStateGIPP}: PageProps | any) => {
        const dispatch = useDispatch();

        const [hydrating, setHydrating] = useState(false);

        /**
         * If GSP has run, then state will _not_ contain the data from GIAP (if it exists), because GSP is run at build
         * time, and GIAP runs at request time.
         *
         * So we have to hydrate the GSP data first, and then do another hydrate on the GIAP state.
         *
         * If GSSP has run, then state _will_ contain the data from GIAP (if there is a GIAP) and the GSSP data combined
         * (see https://github.com/kirill-konshin/next-redux-wrapper/pull/499#discussion_r1014500941), thus one hydrate.
         *
         * If there is no GSP or GSSP for this page, but there is a GIPP (not _app), there will be one hydrate.
         *
         * If there is no GSP or GSSP and no GIP on page level for this page, but there is a GIAP on _app level there
         * will be also one hydrate.
         *
         *
         * GIPP (partial) -> GIAP (full)
         * GIAP (partial) -> GSSP (full)
         * GIAP (partial) -> GSP (partial)
         *
         */
        const hydrate = useCallback(() => {
            const states = getStates({initialStateGSSP, initialStateGSP, initialStateGIAP, initialStateGIPP});
            states.forEach(([state, source]) =>
                dispatch({
                    type: HYDRATE,
                    payload: getDeserializedState<S>(state, config),
                    meta: {source},
                } as any),
            );
        }, [dispatch, initialStateGSSP, initialStateGSP, initialStateGIAP, initialStateGIPP]);

        // This guard is solely to suppress Next.js warning about useless layout effect
        if (!getIsServer()) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useLayoutEffect(() => {
                if (!(window as any)[RENDER]) {
                    (window as any)[RENDER] = true;
                    return;
                }

                setHydrating(true);

                if (config.debug) {
                    console.log('3. useHydration effect');
                }

                hydrate();

                setHydrating(false);
            }, [dispatch, hydrate]);

            if ((window as any)[RENDER]) {
                return {hydrating};
            }
        }

        console.log('3. useHydration sync');

        hydrate();

        return {hydrating};
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

export interface PageProps {
    initialStateGIAP: any; // stuff in the Store state after App.getInitialProps
    initialStateGIPP: any; // stuff in the Store state after Page.getInitialProps
    initialStateGSSP: any; // stuff in the Store state after getServerSideProps
    initialStateGSP: any; // stuff in the Store state after getStaticProps
}

export interface WrapperProps<P extends Object> {
    initialState: any;
    initialProps: P; // stuff returned from getInitialProps or getServerSideProps
}

export type GetStaticPropsCallback<S extends Store, P extends {[key: string]: any}> = (store: S) => GetStaticProps<P>;
export type GetServerSidePropsCallback<S extends Store, P extends {[key: string]: any}> = (store: S) => GetServerSideProps<P>;
export type PageCallback<S extends Store, P> = (store: S) => NextComponentType<NextPageContext, P, P>['getInitialProps'];
export type AppCallback<S extends Store, P> = (store: S) => ({Component, ctx}: AppContext) => Promise<{pageProps: P}> | {pageProps: P}; // AppInitialProps & //FIXME Could be typeof App.getInitialProps & appGetInitialProps (not exported), see https://github.com/kirill-konshin/next-redux-wrapper/issues/412
export type Callback<S extends Store, P extends {[key: string]: any}> =
    | GetStaticPropsCallback<S, P>
    | GetServerSidePropsCallback<S, P>
    | PageCallback<S, P>
    | AppCallback<S, P>;
