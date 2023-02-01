import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore, withStore} from './testlib';

describe('function API', () => {
    const ctx: any = {req: {request: true}};
    const pageProps = {prop: 'val'};
    const initialState = {reduxStatus: 'val'};
    const action = {type: 'FOO', payload: 'val'};

    test('getStaticProps', async () => {
        expect(
            await createWrapper(makeStore).getStaticProps(store => async context => {
                store.dispatch(action);
                return {props: {...pageProps, __N_SSG: true}, preview: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, __N_SSG: true, reduxWrapperActionsGSP: [action]},
            preview: true,
        });
    });

    test('getServerSideProps', async () => {
        expect(
            await createWrapper(makeStore).getServerSideProps(store => async context => {
                store.dispatch(action);
                return {props: {...pageProps, __N_SSP: true}, fromSSP: true};
            })({req: {}, res: {}, query: true, resolvedUrl: true} as any), //TODO Test missing context items
        ).toEqual({
            props: {...pageProps, __N_SSP: true, reduxWrapperActionsGSSP: [action]},
            fromSSP: true,
        });
    });

    describe('App.getInitialProps', () => {
        const nextJsContext = () => ({
            ctx: {req: {}, res: {}, query: true, pathname: true, AppTree: {}, resolvedUrl: true},
            router: {},
            Component: {},
            AppTree: {},
        }); // overwhelming context with both GIAP and GSSP needs

        test('simple usage', async () => {
            const wrapper = createWrapper(makeStore);
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (context: any) => {
                store.dispatch(action);
                return {pageProps};
            });

            //TODO Test missing context items
            expect(await withStore(wrapper)(App)?.getInitialProps(nextJsContext())).toEqual({
                pageProps: {...pageProps, reduxWrapperActionsGIAP: [action]},
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
                pageProps: {fromApp: true, reduxWrapperActionsGIAP: [{type: 'FOO', payload: 'app'}]},
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
                            payload: 'app',
                            type: 'FOO',
                        },
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
                __N_SSP: true,
            };

            const WrappedPage: any = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        pageProps: {
                            fromApp: true,
                            reduxWrapperActionsGIAP: [
                                {type: 'FOO', payload: 'app'},
                                {type: 'FOO', payload: 'ssp'},
                            ],
                            fromSSP: true,
                            reduxWrapperActionsGSSP: [
                                {type: 'FOO', payload: 'app'},
                                {type: 'FOO', payload: 'ssp'},
                            ],
                        },
                        __N_SSP: true,
                    },
                    state: {reduxStatus: 'init'},
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
                            payload: 'app',
                            type: 'FOO',
                        },
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
                __N_SSG: true,
            };

            const WrappedPage: any = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        pageProps: {
                            fromApp: true,
                            reduxWrapperActionsGIAP: [
                                {type: 'FOO', payload: 'app'},
                                {type: 'FOO', payload: 'ssg'},
                            ],
                            fromSP: true,
                            reduxWrapperActionsGSP: [
                                {type: 'FOO', payload: 'app'},
                                {type: 'FOO', payload: 'ssg'},
                            ],
                        },
                        __N_SSG: true,
                    },
                    state: {reduxStatus: 'init'},
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
                        payload: 'app',
                        type: 'FOO',
                    },
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

            const WrappedPage: any = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        pageProps: {
                            fromApp: true,
                            reduxWrapperActionsGIAP: [
                                {type: 'FOO', payload: 'app'},
                                {type: 'FOO', payload: 'gipp'}, //FIXME why?
                            ],
                            fromGip: true,
                            reduxWrapperActionsGIPP: [
                                {type: 'FOO', payload: 'app'},
                                {type: 'FOO', payload: 'gipp'},
                            ],
                        },
                    },
                    state: {reduxStatus: 'init'},
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
            expect(
                await withStore(wrapper)(Page).getInitialProps({
                    req: {},
                    res: {},
                    query: true,
                    pathname: true,
                    AppTree: {},
                    resolvedUrl: true,
                }),
            ).toEqual({
                pageProps: {
                    prop: 'val',
                },
                reduxWrapperActionsGIPP: [
                    {
                        payload: 'val',
                        type: 'FOO',
                    },
                ],
            });
        });
    });
});

describe('custom serialization', () => {
    test.skip('serialize on server and deserialize on client', async () => {
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
            '{"props":{},"state":{"reduxStatus":"init","serialized":true,"deserialized":true}}',
        );
    });
});
