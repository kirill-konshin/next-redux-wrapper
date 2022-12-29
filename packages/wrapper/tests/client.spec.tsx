/**
 * @jest-environment jsdom
 **/

import * as React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {create, act, ReactTestRenderer} from 'react-test-renderer';
import {DummyComponent, wrapper, child, makeStore, Router, State} from './testlib';
import {createWrapper} from '../src';
import {Store} from 'redux';

let store: Store;

const defaultState = {reduxStatus: 'init'};
const modifiedState = {...defaultState, modified: true};

describe('client integration', () => {
    describe('existing store is taken from window', () => {
        beforeEach(() => {
            store = makeStore();
        });

        test('withRedux', async () => {
            const WrappedPage: any = wrapper.withRedux(DummyComponent);
            expect(
                child(
                    <Router>
                        <WrappedPage initialState={store.getState()} />
                    </Router>,
                ),
            ).toEqual('{"props":{},"state":{"reduxStatus":"init"}}');
        });

        test('API functions', async () => {
            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(s => () => null);
            expect(await wrapper.withRedux(Page)?.getInitialProps({} as any)).toEqual({
                initialProps: {},
                initialState: defaultState,
            });
        });
    });

    test('store is available when calling getInitialProps client-side and references the existing store on client', async () => {
        const w = createWrapper(makeStore);

        const Page: React.ComponentType<any> & {getInitialProps: any} = () => {
            const dispatch = useDispatch();

            React.useEffect(() => {
                // modifies the state,
                dispatch({type: 'MODIFY_STATE'});
            }, [dispatch]);

            return null;
        };
        Page.getInitialProps = w.getInitialPageProps(
            s => () =>
                // when invoked below, verify that state modification is retained in getInitialProps
                expect(s.getState()).toEqual(modifiedState),
        );

        const Wrapped: any = w.withRedux(Page);

        act(() => {
            create(
                <Router>
                    <Wrapped />
                </Router>,
            );
        });

        // expected when invoked above
        await w.withRedux(Page)?.getInitialProps({} as any);
    });

    test('client side action on first render override state from server', () => {
        const stateFromClient = 'state from client';
        const w = createWrapper(makeStore);

        const Page: React.ComponentType<any> = () => {
            const dispatch = useDispatch();
            const reduxStatus = useSelector<State, string | undefined>(state => state.reduxStatus);
            React.useEffect(() => {
                // modifies the state,
                dispatch({type: 'FOO', payload: stateFromClient});
            }, [dispatch]);

            return <>{reduxStatus}</>;
        };

        const Wrapped: any = w.withRedux(Page);

        let renderer: ReactTestRenderer;
        act(() => {
            renderer = create(
                <Router>
                    <Wrapped initialState={{reduxStatus: 'state from server'}} />
                </Router>,
            );
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(renderer!.toJSON()).toEqual(stateFromClient);
    });

    test('client side action on page transition override state from server', () => {
        const stateFromClient = 'state from client';
        const w = createWrapper(makeStore);

        const Page: React.ComponentType<{id: string}> = ({id}) => {
            const dispatch = useDispatch();
            const reduxStatus = useSelector<State, string | undefined>(state => state.reduxStatus);
            React.useEffect(() => {
                // modifies the state,
                dispatch({type: 'FOO', payload: `${stateFromClient} ${id}`});
            }, [dispatch, id]);

            return <>{reduxStatus}</>;
        };

        const Wrapped: any = w.withRedux(Page);

        let renderer: ReactTestRenderer;
        act(() => {
            renderer = create(
                <Router>
                    <Wrapped id="1" />
                </Router>,
            );
        });
        act(() => {
            renderer.update(
                <Router>
                    <Wrapped id="2" initialState={{reduxStatus: 'state from server'}} />
                </Router>,
            );
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(renderer!.toJSON()).toEqual(`${stateFromClient} 2`);
    });
});
