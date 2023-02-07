import * as React from 'react';
import {createWrapper} from '../src';
import {child, DummyComponent, makeStore, withStore} from './testlib';
import {expect, describe, test, jest} from '@jest/globals';

const pageProps = {prop: 'val'};
const action = {type: 'FOO', payload: 'val'};
const actionAPP = {type: 'FOO', payload: 'app'};
const actionSSG = {type: 'FOO', payload: 'ssg'};
const actionSSR = {type: 'FOO', payload: 'ssr'};

const nextJsContext = () =>
    ({
        ctx: {req: {}, res: {}, query: true, pathname: true, AppTree: {}, resolvedUrl: true} as any,
        router: {},
        Component: {},
        AppTree: {},
    } as any); // overwhelming context with both GIAP and GSSP needs

describe('function API', () => {
    test('getStaticProps', async () => {
        const wrapper = createWrapper(makeStore);

        const resultingProps: any = await wrapper.getStaticProps(store => async context => {
            store.dispatch(actionSSG);
            return {props: pageProps, preview: true};
        })({}); //TODO Test missing context items

        expect(resultingProps).toEqual({
            props: {
                ...pageProps,
                reduxWrapperActionsGSP: [actionSSG],
            },
            preview: true,
        });

        const WrappedPage = withStore(wrapper)(DummyComponent);

        expect(child(<WrappedPage {...resultingProps.props} />)).toEqual(
            JSON.stringify({
                props: {
                    prop: 'val',
                    reduxWrapperActionsGSP: [actionSSG],
                },
                state: {reduxStatus: actionSSG.payload},
            }),
        );
    });

    test('getServerSideProps', async () => {
        const wrapper = createWrapper(makeStore);

        const resultingProps: any = await wrapper.getServerSideProps(store => async context => {
            store.dispatch(actionSSR);
            return {props: pageProps, nonPropForSSP: true};
        })(nextJsContext().ctx); //TODO Test missing context items

        expect(resultingProps).toEqual({
            props: {
                ...pageProps,
                reduxWrapperActionsGSSP: [actionSSR],
            },
            nonPropForSSP: true,
        });

        const WrappedPage = withStore(wrapper)(DummyComponent);

        expect(child(<WrappedPage {...resultingProps.props} />)).toEqual(
            JSON.stringify({
                props: {
                    prop: 'val',
                    reduxWrapperActionsGSSP: [actionSSR],
                },
                state: {reduxStatus: actionSSR.payload},
            }),
        );
    });

    describe('App.getInitialProps', () => {
        test('simple usage', async () => {
            const wrapper = createWrapper(makeStore);

            const App = () => null;
            App.getInitialProps = wrapper.getInitialAppProps(store => async (context: any) => {
                store.dispatch(actionAPP);
                return {pageProps};
            });

            const resultingProps = await App.getInitialProps(nextJsContext());

            //TODO Test missing context items
            expect(resultingProps).toEqual({
                pageProps: {
                    ...pageProps,
                    reduxWrapperActionsGIAP: [actionAPP],
                },
            });

            const WrappedPage = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps.pageProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        prop: 'val',
                        reduxWrapperActionsGIAP: [actionAPP],
                    },
                    state: {reduxStatus: actionAPP.payload},
                }),
            );
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
                store.dispatch(actionAPP);
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await App.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {
                    fromApp: true,
                    reduxWrapperActionsGIAP: [actionAPP],
                },
            });

            // Execute Page level
            const serverSideProps = await wrapper.getServerSideProps(store => async () => {
                expect(store.getState()).toEqual({reduxStatus: actionAPP.payload}); // same store with value because context was shared
                store.dispatch(actionSSR);
                return {props: {fromSSP: true}};
            })(context.ctx);

            expect(serverSideProps).toEqual({
                props: {
                    fromSSP: true,
                    reduxWrapperActionsGSSP: [actionSSR],
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
                        reduxWrapperActionsGIAP: [actionAPP],
                        fromSSP: true,
                        reduxWrapperActionsGSSP: [actionSSR],
                    },
                    state: {reduxStatus: actionSSR.payload},
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
                store.dispatch(actionAPP);
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await App.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {
                    fromApp: true,
                    reduxWrapperActionsGIAP: [actionAPP],
                },
            });

            // Execute Page level
            const serverStaticProps = await wrapper.getStaticProps(store => async () => {
                expect(store.getState()).toEqual({reduxStatus: 'init'}); // new store, due to new context
                store.dispatch(actionSSG);
                return {props: {fromSP: true}};
            })({}); // no context because it can be empty

            expect(serverStaticProps).toEqual({
                props: {
                    fromSP: true,
                    reduxWrapperActionsGSP: [actionSSG],
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
                        reduxWrapperActionsGIAP: [actionAPP],
                        fromSP: true,
                        reduxWrapperActionsGSP: [actionSSG],
                    },
                    state: {reduxStatus: actionAPP.payload},
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
                store.dispatch(actionAPP);
                return {pageProps: {fromApp: true}};
            });

            const initialAppProps = await App.getInitialProps(context);

            expect(initialAppProps).toEqual({
                pageProps: {
                    fromApp: true,
                    reduxWrapperActionsGIAP: [actionAPP],
                },
            });

            // Execute Page level
            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(store => async (_ctx: any) => {
                store.dispatch(action);
                return {fromGip: true};
            });

            const initialPageProps = await Page.getInitialProps?.(context.ctx);

            expect(initialPageProps).toEqual({
                fromGip: true,
                reduxWrapperActionsGIPP: [action],
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
                        reduxWrapperActionsGIAP: [actionAPP],
                        fromGip: true,
                        reduxWrapperActionsGIPP: [action],
                    },
                    state: {reduxStatus: actionAPP.payload},
                }),
            );
        });
    });

    describe('Page.getInitialProps', () => {
        test('simple context', async () => {
            const wrapper = createWrapper(makeStore);

            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(store => async (context: any) => {
                store.dispatch(action);
                return pageProps;
            });

            const resultingProps = await Page.getInitialProps?.(nextJsContext().ctx);

            expect(resultingProps).toEqual({
                prop: 'val',
                reduxWrapperActionsGIPP: [action],
            });

            const WrappedPage = withStore(wrapper)(DummyComponent);

            expect(child(<WrappedPage {...resultingProps} />)).toEqual(
                JSON.stringify({
                    props: {
                        prop: 'val',
                        reduxWrapperActionsGIPP: [action],
                    },
                    state: {reduxStatus: action.payload},
                }),
            );
        });
    });
});

describe('custom serialization', () => {
    test('serialize on server and deserialize on client', async () => {
        const serialize = jest.fn((actions: any) => {
            console.log(actions);
            return actions.map((a: any) => ({...a, payload: JSON.stringify(a.payload)}));
        });
        const deserialize = jest.fn((actions: any) => actions.map((a: any) => ({...a, payload: JSON.parse(a.payload)})));

        const wrapper = createWrapper(makeStore, {
            serialize,
            deserialize,
            debug: true, // just for sake of coverage
        });

        const Page = () => null;
        Page.getInitialProps = wrapper.getInitialPageProps(store => () => {
            store.dispatch(action);
            return pageProps;
        });

        const props = await Page.getInitialProps?.(nextJsContext().ctx);

        expect(serialize).toBeCalled();

        expect(props).toEqual({
            ...pageProps,
            reduxWrapperActionsGIPP: [
                {
                    type: 'FOO',
                    payload: '"val"',
                },
            ],
        });

        const WrappedApp: any = withStore(wrapper)(DummyComponent);

        expect(child(<WrappedApp {...props} wrapper={wrapper} />)).toEqual(
            JSON.stringify({
                props: {
                    ...pageProps,
                    reduxWrapperActionsGIPP: [
                        {
                            type: 'FOO',
                            payload: '"val"',
                        },
                    ],
                    wrapper: {},
                },
                state: {reduxStatus: 'val'},
            }),
        );

        expect(deserialize).toBeCalled();
    });
});
