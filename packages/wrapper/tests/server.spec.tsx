import * as React from 'react';
import {create} from 'react-test-renderer';
import {createWrapper} from '../src';
import {DummyComponent, makeStore, makeStoreStub} from './testlib';
import {NextPageContext} from 'next';

describe('function API', () => {
    test.each([
        ['getInitialAppProps', 'simple context', 1, {pageProps: {prop: 'val'}}, {ctx: {req: 'request'}}],
        ['getInitialPageProps', 'simple context', 1, {pageProps: {prop: 'val'}}, {req: 'request'}],
        ['getInitialPageProps', 'context with store', 0, {pageProps: {prop: 'val'}}, {req: 'request', store: 'foo'}],
        [
            'getStaticProps',
            'simple context',
            1,
            {props: {prop: 'val'}, revalidate: true},
            {preview: true, previewData: 'previewData'},
        ],
        ['getServerSideProps', 'simple context', 1, {props: {prop: 'val'}}, {req: 'request'}],
    ])('%s (%s)', async (func: string, subtype: string, calledTime: number, props: any, context: any) => {
        const makeStore = makeStoreStub({state: 'val'});
        const wrapper = createWrapper(makeStore);

        const propsCb = jest.fn(async context => {
            expect(makeStore).toBeCalledTimes(calledTime);
            expect(context).toMatchSnapshot();
            return props;
        });

        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        //@ts-ignore
        const fn = wrapper[func](propsCb);
        expect(await fn(context)).toMatchSnapshot();
        expect(propsCb).toBeCalledTimes(1);
    });

    test('getInitialPageProps context with store & no callback', async () => {
        const makeStore = makeStoreStub({state: 'val'});
        const wrapper = createWrapper(makeStore);
        expect(
            await wrapper.getInitialPageProps()({
                // purposely make a store to enter condition
                store: makeStore(),
            } as any),
        ).toMatchSnapshot();
        expect(makeStore).toBeCalledTimes(1); // make sure makeStore has not been called in wrapper
    });
});

describe('withRedux', () => {
    describe('merges props', () => {
        test('for page case', () => {
            const wrapper = createWrapper(makeStore);
            const WrappedPage: any = wrapper.withRedux(DummyComponent);
            expect(
                create(<WrappedPage initialProps={{fromPage: true}} somePropFromNextJs={true} />).toJSON(),
            ).toMatchSnapshot();
        });
        test('for app case', () => {
            const wrapper = createWrapper(makeStore);
            const WrappedApp: any = wrapper.withRedux(DummyComponent);
            expect(
                create(
                    <WrappedApp initialProps={{pageProps: {fromApp: true}}} pageProps={{getStaticProp: true}} />,
                ).toJSON(),
            ).toMatchSnapshot();
        });
    });
    describe('wrapped component', () => {
        test('should not have getInitialProps if source component did not have it', () => {
            const wrapper = createWrapper(makeStore);
            expect(wrapper.withRedux(DummyComponent)).not.toHaveProperty('getInitialProps');
        });
        test('should have getInitialProps if source component have it', async () => {
            const wrapper = createWrapper(makeStore);

            const Page = (props: any) => <DummyComponent {...props} />;
            Page.getInitialProps = () => ({prop: 'val'});
            const WrappedPage = wrapper.withRedux(Page) as any;
            expect(await WrappedPage.getInitialProps()).toMatchSnapshot();
            expect(create(<WrappedPage />).toJSON()).toMatchSnapshot(); // to trigger creation of class
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

        expect(props).toMatchSnapshot();

        const WrappedApp = wrapper.withRedux(DummyComponent);

        expect(create(<WrappedApp {...props} />).toJSON()).toMatchSnapshot();
    });
});
