import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore} from './testlib';
import {NextPageContext} from 'next';

describe('function API', () => {
    const ctx = {req: {request: true}};
    const pageProps = {prop: 'val'};
    const initialState = {reduxStatus: 'val'};

    test.each([
        [
            'getInitialAppProps',
            'simple context',
            {pageProps},
            {
                initialProps: {pageProps},
                initialState,
            },
            {ctx},
        ],
        [
            'getInitialPageProps',
            'simple context',
            {pageProps: {prop: 'val'}},
            {
                initialProps: {pageProps},
                initialState,
            },
            ctx,
        ],
        [
            'getInitialPageProps',
            'context with store',
            {pageProps},
            {pageProps}, // no wrapping
            {...ctx, store: {dispatch: jest.fn()}},
        ],
        [
            'getStaticProps',
            'simple context',
            {props: pageProps, preview: true},
            {
                props: {...pageProps, initialState},
                preview: true,
            },
            ctx,
        ],
        [
            'getServerSideProps',
            'simple context',
            {props: pageProps, revalidate: true},
            {
                props: {...pageProps, initialState},
                revalidate: true,
            },
            ctx,
        ],
    ])('%s (%s)', async (func: string, subname: string, props: any, expected: any, context: any) => {
        expect(
            await (createWrapper(makeStore) as any)[func](async (context: any) => {
                (context.ctx || context).store.dispatch({type: 'FOO', payload: 'val'});
                return props;
            })(context),
        ).toEqual(expected);
    });

    test('getInitialPageProps context with store & no callback', async () => {
        const makeStoreMock = jest.fn(makeStore);
        const wrapper = createWrapper(makeStoreMock);
        expect(await wrapper.getInitialPageProps()({store: makeStoreMock()} as any)).toBeUndefined();
        expect(makeStoreMock).toBeCalledTimes(1); // make sure makeStore has not been called in wrapper
    });

    test('getInitialAppProps and getServerSideProps', async () => {
        const wrapper = createWrapper(makeStore);
        const context = {ctx: {req: {}}} as any;

        // execute App level

        const initialAppProps = await wrapper.getInitialAppProps(({ctx}: any) => {
            ctx.store.dispatch({type: 'FOO', payload: 'app'});
            return {pageProps: {fromApp: true}};
        })(context);

        expect(initialAppProps).toEqual({
            initialProps: {pageProps: {fromApp: true}},
            initialState: {reduxStatus: 'app'},
        });

        // execute Page level

        const serverSideProps = await wrapper.getServerSideProps(({store}) => {
            expect(store.getState()).toEqual({reduxStatus: 'app'});
            store.dispatch({type: 'FOO', payload: 'ssp'});
            return {props: {fromSSP: true}};
        })(context);

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

describe('withRedux', () => {
    describe('merges props', () => {
        test('for page case', () => {
            const wrapper = createWrapper(makeStore);
            const WrappedPage: any = wrapper.withRedux(DummyComponent);
            expect(child(<WrappedPage initialProps={{fromPage: true}} somePropFromNextJs={true} />)).toEqual(
                '{"props":{"fromPage":true,"somePropFromNextJs":true},"state":{"reduxStatus":"init"}}',
            );
        });
        test('for app case', () => {
            const wrapper = createWrapper(makeStore);
            const WrappedApp: any = wrapper.withRedux(DummyComponent);
            expect(
                child(<WrappedApp initialProps={{pageProps: {fromApp: true}}} pageProps={{getStaticProp: true}} />),
            ).toEqual('{"props":{"pageProps":{"fromApp":true,"getStaticProp":true}},"state":{"reduxStatus":"init"}}');
        });
    });
    describe('wrapped component', () => {
        test('should not have getInitialProps if source component did not have it', () => {
            const wrapper = createWrapper(makeStore);
            expect(wrapper.withRedux(DummyComponent)).not.toHaveProperty('getInitialProps');
        });
        test('should have getInitialProps if source component have it', async () => {
            const wrapper = createWrapper(makeStore);
            const props = {prop: 'val'};
            const Page = (props: any) => <DummyComponent {...props} />;
            Page.getInitialProps = () => props;
            const WrappedPage = wrapper.withRedux(Page) as any;
            expect(await WrappedPage.getInitialProps()).toEqual(props); // no wrapping
            expect(child(<WrappedPage />)).toEqual('{"props":{},"state":{"reduxStatus":"init"}}'); // to trigger creation of class
        });
    });
});

describe('custom serialization', () => {
    test('serialize on server and deserialize on client', async () => {
        const wrapper = createWrapper(makeStore, {
            serializeState: (state: any) => ({...state, serialized: true}),
            deserializeState: (state: any) => ({...state, deserialized: true}),
            debug: true,
        });

        const props = await wrapper.getInitialPageProps()({} as NextPageContext);

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
