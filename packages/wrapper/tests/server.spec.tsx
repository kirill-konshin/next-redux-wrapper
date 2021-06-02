import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore} from './testlib';

describe('function API', () => {
    const ctx: any = {req: {request: true}};
    const pageProps = {prop: 'val'};
    const initialState = {reduxStatus: 'val'};

    test('getStaticProps', async () => {
        expect(
            await createWrapper(makeStore).getStaticProps(store => async context => {
                store.dispatch({type: 'FOO', payload: 'val'});
                return {props: pageProps, preview: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, initialState},
            preview: true,
        });
    });

    test('getServerSideProps', async () => {
        expect(
            await createWrapper(makeStore).getServerSideProps(store => async context => {
                store.dispatch({type: 'FOO', payload: 'val'});
                return {props: pageProps, fromSSP: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, initialState},
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
         * 2. getStaticProps or getServerSideProps
         */
        test('with and getServerSideProps at page level', async () => {
            const wrapper = createWrapper(makeStore);
            const context = {ctx: {req: {}}} as any;

            // execute App level

            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (ctx: any) => {
                store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await wrapper.withRedux(App)?.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {fromApp: true},
                initialState: {reduxStatus: 'app'},
            });

            // execute Page level

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

            // merge props and verify

            const resultingProps = {
                ...initialAppProps,
                pageProps: {
                    // NextJS will wrap it like this
                    ...initialAppProps.pageProps,
                    ...(serverSideProps as any).props,
                },
            };

            const WrappedPage: any = wrapper.withRedux(DummyComponent);

            expect(child(<WrappedPage {...resultingProps} />)).toEqual(
                '{"props":{"pageProps":{"fromApp":true,"fromSSP":true}},"state":{"reduxStatus":"ssp"}}',
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
            expect(child(<WrappedPage initialProps={{fromPage: true}} somePropFromNextJs={true} />)).toEqual(
                '{"props":{"fromPage":true,"somePropFromNextJs":true},"state":{"reduxStatus":"init"}}',
            );
        });
        test('for app case', () => {
            const WrappedApp: any = createWrapper(makeStore).withRedux(DummyComponent);
            expect(
                child(<WrappedApp initialProps={{pageProps: {fromApp: true}}} pageProps={{getStaticProp: true}} />),
            ).toEqual('{"props":{"pageProps":{"fromApp":true,"getStaticProp":true}},"state":{"reduxStatus":"init"}}');
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

        expect(child(<WrappedApp {...props} />)).toEqual(
            '{"props":{},"state":{"reduxStatus":"init","serialized":true,"deserialized":true}}',
        );
    });
});
