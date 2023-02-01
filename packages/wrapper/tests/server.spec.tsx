import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore, withStore} from './testlib';

describe('function API', () => {
    const ctx: any = {req: {request: true}};
    const pageProps = {prop: 'val'};
    const action = {type: 'FOO', payload: 'val'};

    const nextJsContext = () => ({
        ctx: {req: {}, res: {}, query: true, pathname: true, AppTree: {}, resolvedUrl: true},
        router: {},
        Component: {},
        AppTree: {},
    }); // overwhelming context with both GIAP and GSSP needs

    test('getStaticProps', async () => {
        expect(
            await createWrapper(makeStore).getStaticProps(store => async context => {
                store.dispatch(action);
                return {props: pageProps, preview: true};
            })(ctx),
        ).toEqual({
            props: {
                ...pageProps,
                reduxWrapperActionsGSP: [action],
            },
            preview: true,
        });
    });

    test('getServerSideProps', async () => {
        expect(
            await createWrapper(makeStore).getServerSideProps(store => async context => {
                store.dispatch(action);
                return {props: pageProps, fromSSP: true};
            })({req: {}, res: {}, query: true, resolvedUrl: true} as any), //TODO Test missing context items
        ).toEqual({
            props: {
                ...pageProps,
                reduxWrapperActionsGSSP: [action],
            },
            fromSSP: true,
        });
    });

    describe('App.getInitialProps', () => {
        test('simple usage', async () => {
            const wrapper = createWrapper(makeStore);

            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (context: any) => {
                store.dispatch(action);
                return {pageProps};
            });

            //TODO Test missing context items
            expect(await withStore(wrapper)(App)?.getInitialProps(nextJsContext())).toEqual({
                pageProps: {
                    ...pageProps,
                    reduxWrapperActionsGIAP: [action],
                },
            });
        });

        /**
         * Next.js executes wrappers in following order:
         * 1. App.getInitialProps
         * 2. getServerSideProps
         */
        test('with App.getInitialProps and getServerSideProps at page level', async () => {
            const wrapper = createWrapper(makeStore);
            const context = nextJsContext();

            // Execute App level
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await withStore(wrapper)(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {
                    fromApp: true,
                    reduxWrapperActionsGIAP: [{type: 'FOO', payload: 'app'}],
                },
            });

            // Execute Page level
            const serverSideProps = await wrapper.getServerSideProps(store => async () => {
                expect(store.getState()).toEqual({reduxStatus: 'app'});
                store.dispatch({type: 'FOO', payload: 'ssp'});
                return {props: {fromSSP: true}};
            })(context.ctx as any);

            expect(serverSideProps).toEqual({
                props: {
                    fromSSP: true,
                    reduxWrapperActionsGSSP: [
                        {
                            payload: 'ssp',
                            type: 'FOO',
                        },
                    ],
                },
            });

            // Merge props and verify
            const resultingProps = {
                ...initialAppProps,
                pageProps: {
                    // NextJS will wrap it like this
                    ...initialAppProps.pageProps,
                    ...(serverSideProps as any).props,
                },
            };

            const WrappedPage = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps.pageProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        fromApp: true,
                        reduxWrapperActionsGIAP: [{type: 'FOO', payload: 'app'}],
                        fromSSP: true,
                        reduxWrapperActionsGSSP: [{type: 'FOO', payload: 'ssp'}],
                    },
                    state: {reduxStatus: 'ssp'},
                }),
            );
        });

        /**
         * Next.js executes wrappers in following order:
         * 1. App.getInitialProps
         * 2. getStaticProps
         */
        test('with App.getInitialProps and getStaticProps at page level', async () => {
            const wrapper = createWrapper(makeStore);
            const context = nextJsContext();

            // Execute App level
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await withStore(wrapper)(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {
                    fromApp: true,
                    reduxWrapperActionsGIAP: [
                        {
                            payload: 'app',
                            type: 'FOO',
                        },
                    ],
                },
            });

            // Execute Page level
            const serverStaticProps = await wrapper.getStaticProps(store => async () => {
                expect(store.getState()).toEqual({reduxStatus: 'app'});
                store.dispatch({type: 'FOO', payload: 'ssg'});
                return {props: {fromSP: true}};
            })(context.ctx as any);

            expect(serverStaticProps).toEqual({
                props: {
                    fromSP: true,
                    reduxWrapperActionsGSP: [
                        {
                            payload: 'ssg',
                            type: 'FOO',
                        },
                    ],
                },
            });

            // Merge props and verify
            const resultingProps = {
                ...initialAppProps,
                pageProps: {
                    // NextJS will wrap it like this
                    ...initialAppProps.pageProps,
                    ...(serverStaticProps as any).props,
                },
            };

            const WrappedPage = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps.pageProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        fromApp: true,
                        reduxWrapperActionsGIAP: [{type: 'FOO', payload: 'app'}],
                        fromSP: true,
                        reduxWrapperActionsGSP: [{type: 'FOO', payload: 'ssg'}],
                    },
                    state: {reduxStatus: 'app'},
                }),
            );
        });

        /**
         * Next.js executes wrappers in following order:
         * 1. App.getInitialProps
         * 2. Page.getInitialProps
         */
        test('with App.getInitialProps and Page.getInitialProps', async () => {
            const wrapper = createWrapper(makeStore);
            const context = nextJsContext();

            // Execute App level
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await withStore(wrapper)(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {
                    fromApp: true,
                    reduxWrapperActionsGIAP: [
                        {
                            payload: 'app',
                            type: 'FOO',
                        },
                    ],
                },
            });

            // Execute Page level
            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'gipp'});
                return {fromGip: true};
            });

            const initialPageProps = await withStore(wrapper)(Page).getInitialProps(context.ctx);

            expect(initialPageProps).toEqual({
                fromGip: true,
                reduxWrapperActionsGIPP: [
                    {
                        payload: 'gipp',
                        type: 'FOO',
                    },
                ],
            });

            // Merge props and verify
            const resultingProps = {
                ...initialAppProps,
                pageProps: {
                    // NextJS will wrap it like this
                    ...initialAppProps.pageProps,
                    ...initialPageProps,
                    // Notice there's no __N_SSG or __N_SSP here because this is Page.getInitialProps!
                },
            };

            const WrappedPage = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps.pageProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        fromApp: true,
                        reduxWrapperActionsGIAP: [{type: 'FOO', payload: 'app'}],
                        fromGip: true,
                        reduxWrapperActionsGIPP: [{type: 'FOO', payload: 'gipp'}],
                    },
                    state: {reduxStatus: 'app'},
                }),
            );
        });
    });

    describe('Page.getInitialProps', () => {
        test('simple context', async () => {
            const wrapper = createWrapper(makeStore);

            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(store => async (context: any) => {
                store.dispatch({type: 'FOO', payload: 'val'});
                return {pageProps};
            });

            expect(await withStore(wrapper)(Page).getInitialProps(nextJsContext().ctx)).toEqual({
                pageProps: {
                    prop: 'val',
                },
                reduxWrapperActionsGIPP: [{payload: 'val', type: 'FOO'}],
            });
        });
    });
});

describe.skip('custom serialization', () => {
    test('serialize on server and deserialize on client', async () => {
        const wrapper = createWrapper(makeStore, {
            serializeAction: (state: any) => ({...state, serialized: true}),
            deserializeAction: (state: any) => ({...state, deserialized: true}),
            debug: true,
        });

        const Page = () => null;
        Page.getInitialProps = wrapper.getInitialPageProps(store => () => null as any);

        const props = await withStore(wrapper)(Page)?.getInitialProps({});

        expect(props).toEqual({
            initialProps: {},
            initialState: {
                reduxStatus: 'init',
                serialized: true,
            },
        });

        const WrappedApp: any = withStore(wrapper)(DummyComponent);

        expect(child(<WrappedApp {...props} />)).toEqual(
            JSON.stringify({props: {}, state: {reduxStatus: 'init', serialized: true, deserialized: true}}),
        );
    });
});
