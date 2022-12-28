import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore, Router} from './testlib';

describe('function API', () => {
    const ctx: any = {req: {request: true}};
    const pageProps = {prop: 'val'};
    const initialState = {reduxStatus: 'val'};

    test('getStaticProps', async () => {
        expect(
            await createWrapper(makeStore).getStaticProps(store => async context => {
                store.dispatch({type: 'FOO', payload: 'val'});
                return {props: {...pageProps, __N_SSG: true}, preview: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, __N_SSG: true, initialState},
            preview: true,
        });
    });

    test('getServerSideProps', async () => {
        expect(
            await createWrapper(makeStore).getServerSideProps(store => async context => {
                store.dispatch({type: 'FOO', payload: 'val'});
                return {props: {...pageProps, __N_SSP: true}, fromSSP: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, __N_SSP: true, initialState},
            fromSSP: true,
        });
    });

    describe('App.getInitialProps', () => {
        test('simple usage', async () => {
            const wrapper = createWrapper(makeStore);
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (context: any) => {
                store.dispatch({type: 'FOO', payload: 'val'});
                return {pageProps};
            });

            expect(await wrapper.withRedux(App)?.getInitialProps({ctx})).toEqual({
                pageProps,
                initialState,
            });
        });

        /**
         * Next.js executes wrappers in following order:
         * 1. App.getInitialProps
         * 2. getServerSideProps
         */
        test('with App.getInitialProps and getServerSideProps at page level', async () => {
            const wrapper = createWrapper(makeStore);
            const context = {ctx: {req: {}}} as any;

            // Execute App level
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await wrapper.withRedux(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {fromApp: true},
                initialState: {reduxStatus: 'app'},
            });

            // Execute Page level
            const serverSideProps = await wrapper.getServerSideProps(store => async () => {
                expect(store.getState()).toEqual({reduxStatus: 'app'});
                store.dispatch({type: 'FOO', payload: 'ssp'});
                return {props: {fromSSP: true}};
            })(context.ctx);

            expect(serverSideProps).toEqual({
                props: {
                    fromSSP: true,
                    initialState: {reduxStatus: 'ssp'},
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

            const WrappedPage: any = wrapper.withRedux(DummyComponent);

            expect(
                child(
                    <Router>
                        <WrappedPage {...resultingProps} />
                    </Router>,
                ),
            ).toEqual('{"props":{"pageProps":{"fromApp":true,"fromSSP":true},"__N_SSP":true},"state":{"reduxStatus":"ssp"}}');
        });

        /**
         * Next.js executes wrappers in following order:
         * 1. App.getInitialProps
         * 2. getStaticProps
         */
        test('with App.getInitialProps and getStaticProps at page level', async () => {
            const wrapper = createWrapper(makeStore);
            const context = {ctx: {req: {}}} as any;

            // Execute App level
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await wrapper.withRedux(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {fromApp: true},
                initialState: {reduxStatus: 'app'},
            });

            // Execute Page level
            const serverStaticProps = await wrapper.getStaticProps(store => async () => {
                expect(store.getState()).toEqual({reduxStatus: 'app'});
                store.dispatch({type: 'FOO', payload: 'ssg'});
                return {props: {fromSP: true}};
            })(context.ctx);

            expect(serverStaticProps).toEqual({
                props: {
                    fromSP: true,
                    initialState: {reduxStatus: 'ssg'},
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

            const WrappedPage: any = wrapper.withRedux(DummyComponent);

            expect(
                child(
                    <Router>
                        <WrappedPage {...resultingProps} />
                    </Router>,
                ),
            ).toEqual('{"props":{"pageProps":{"fromApp":true,"fromSP":true},"__N_SSG":true},"state":{"reduxStatus":"ssg"}}');
        });

        /**
         * Next.js executes wrappers in following order:
         * 1. App.getInitialProps
         * 2. Page.getInitialProps
         */
        test('with App.getInitialProps and Page.getInitialProps', async () => {
            const wrapper = createWrapper(makeStore);
            const context = {ctx: {req: {}}} as any;

            // Execute App level
            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await wrapper.withRedux(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {fromApp: true},
                initialState: {reduxStatus: 'app'},
            });

            // Execute Page level
            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(store => async (_ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'gipp'});
                return {fromGip: true};
            });

            const initialPageProps = await wrapper.withRedux(Page).getInitialProps(context);

            expect(initialPageProps).toEqual({
                initialProps: {fromGip: true},
                initialState: {reduxStatus: 'gipp'},
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

            const WrappedPage: any = wrapper.withRedux(DummyComponent);

            expect(
                child(
                    <Router>
                        <WrappedPage {...resultingProps} />
                    </Router>,
                ),
            ).toEqual('{"props":{"pageProps":{"fromApp":true,"fromGip":true}},"state":{"reduxStatus":"gipp"}}');
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
            expect(await wrapper.withRedux(Page).getInitialProps(ctx)).toEqual({
                initialProps: {pageProps},
                initialState,
            });
        });
    });
});

describe('withRedux', () => {
    describe('merges props', () => {
        test('for page case', () => {
            const WrappedPage: any = createWrapper(makeStore).withRedux(DummyComponent);
            expect(
                child(
                    <Router>
                        <WrappedPage initialProps={{fromPage: true}} somePropFromNextJs={true} />
                    </Router>,
                ),
            ).toEqual('{"props":{"fromPage":true,"somePropFromNextJs":true},"state":{"reduxStatus":"init"}}');
        });
        test('for app case', () => {
            const WrappedApp: any = createWrapper(makeStore).withRedux(DummyComponent);
            expect(
                child(
                    <Router>
                        <WrappedApp initialProps={{pageProps: {fromApp: true}}} pageProps={{getStaticProp: true}} />
                    </Router>,
                ),
            ).toEqual('{"props":{"pageProps":{"fromApp":true,"getStaticProp":true}},"state":{"reduxStatus":"init"}}');
        });
        test('for page case (new Next versions)', () => {
            const WrappedPage: any = createWrapper(makeStore).withRedux(DummyComponent);
            expect(
                child(
                    <Router>
                        <WrappedPage pageProps={{initialProps: {fromPage: true}}} somePropFromNextJs={true} />
                    </Router>,
                ),
            ).toEqual('{"props":{"pageProps":{"fromPage":true},"somePropFromNextJs":true},"state":{"reduxStatus":"init"}}');
        });
    });
    test('wrapped component should not have getInitialProps if source component did not have it', () => {
        expect(createWrapper(makeStore).withRedux(DummyComponent).getInitialProps).toBeUndefined();
    });
});

describe('custom serialization', () => {
    test('serialize on server and deserialize on client', async () => {
        const wrapper = createWrapper(makeStore, {
            serializeState: (state: any) => ({...state, serialized: true}),
            deserializeState: (state: any) => ({...state, deserialized: true}),
            debug: true,
        });

        const Page = () => null;
        Page.getInitialProps = wrapper.getInitialPageProps(store => () => null);

        const props = await wrapper.withRedux(Page)?.getInitialProps({});

        expect(props).toEqual({
            initialProps: {},
            initialState: {
                reduxStatus: 'init',
                serialized: true,
            },
        });

        const WrappedApp: any = wrapper.withRedux(DummyComponent);

        expect(
            child(
                <Router>
                    <WrappedApp {...props} />
                </Router>,
            ),
        ).toEqual('{"props":{},"state":{"reduxStatus":"init","serialized":true,"deserialized":true}}');
    });
});
