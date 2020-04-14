import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore} from './testlib';
import {NextPageContext} from 'next';

describe('function API', () => {
    const ctx: any = {req: {request: true}};
    const pageProps = {prop: 'val'};
    const initialState = {reduxStatus: 'val'};

    test('getStaticProps', async () => {
        expect(
            await createWrapper(makeStore).getStaticProps(async context => {
                context.store.dispatch({type: 'FOO', payload: 'val'});
                return {props: pageProps, preview: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, initialState},
            preview: true,
        });
    });

    test('getServerSideProps', async () => {
        expect(
            await createWrapper(makeStore).getStaticProps(async context => {
                context.store.dispatch({type: 'FOO', payload: 'val'});
                return {props: pageProps, revalidate: true};
            })(ctx),
        ).toEqual({
            props: {...pageProps, initialState},
            revalidate: true,
        });
    });

    describe('App.getInitialProps', () => {
        test('simple usage', async () => {
            const App = () => null;
            App.getInitialProps = async (context: any) => {
                context.ctx.store.dispatch({type: 'FOO', payload: 'val'});
                return {pageProps};
            };

            expect(await (createWrapper(makeStore).withRedux(App) as any).getInitialProps({ctx})).toEqual({
                initialProps: {pageProps},
                initialState,
            });
        });

        test('with and getServerSideProps at page level', async () => {
            const wrapper = createWrapper(makeStore);
            const context = {ctx: {req: {}}} as any;

            // execute App level

            const App = () => null;
            App.getInitialProps = ({ctx}: any) => {
                ctx.store.dispatch({type: 'FOO', payload: 'app'});
                return {pageProps: {fromApp: true}};
            };

            const initialAppProps = await (wrapper.withRedux(App) as any).getInitialProps(context);

            expect(initialAppProps).toEqual({
                initialProps: {pageProps: {fromApp: true}},
                initialState: {reduxStatus: 'app'},
            });

            // execute Page level

            const serverSideProps = await wrapper.getServerSideProps(({store}) => {
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
                pageProps: serverSideProps.props, // this is what NextJS will wrap it like this
            };

            const WrappedPage: any = wrapper.withRedux(DummyComponent);

            expect(child(<WrappedPage {...resultingProps} />)).toEqual(
                '{"props":{"pageProps":{"fromApp":true,"fromSSP":true}},"state":{"reduxStatus":"ssp"}}',
            );
        });
    });

    describe('Page.getInitialProps', () => {
        test('simple context', async () => {
            const Page = () => null;
            Page.getInitialProps = async (context: any) => {
                context.store.dispatch({type: 'FOO', payload: 'val'});
                return {pageProps};
            };
            expect(await (createWrapper(makeStore).withRedux(Page) as any).getInitialProps(ctx)).toEqual({
                initialProps: {pageProps},
                initialState,
            });
        });

        test('context with store', async () => {
            const Page = () => null;
            Page.getInitialProps = async (context: any) => {
                context.store.dispatch({type: 'FOO', payload: 'val'});
                return {pageProps};
            };
            expect(
                await (createWrapper(makeStore).withRedux(Page) as any).getInitialProps({
                    ...ctx,
                    store: {dispatch: jest.fn()},
                }),
            ).toEqual({pageProps});
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
        expect(createWrapper(makeStore).withRedux(DummyComponent)).not.toHaveProperty('getInitialProps');
    });
});

describe('custom serialization', () => {
    test('serialize on server and deserialize on client', async () => {
        const wrapper = createWrapper(makeStore, {
            serializeState: (state: any) => ({...state, serialized: true}),
            deserializeState: (state: any) => ({...state, deserialized: true}),
            debug: true,
        });

        const Cmp = () => null;
        Cmp.getInitialProps = () => null;

        const props = await (wrapper.withRedux(Cmp) as any).getInitialProps({} as NextPageContext);

        expect(props).toEqual({
            initialProps: {},
            initialState: {
                reduxStatus: 'init',
                serialized: true,
            },
        });

        const WrappedApp = wrapper.withRedux(DummyComponent);

        expect(child(<WrappedApp {...props} />)).toEqual(
            '{"props":{},"state":{"reduxStatus":"init","serialized":true,"deserialized":true}}',
        );
    });
});
