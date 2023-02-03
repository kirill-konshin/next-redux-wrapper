/**
 * @jest-environment jsdom
 **/

import * as React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {create, act, ReactTestRenderer} from 'react-test-renderer';
import {DummyComponent, wrapper, child, makeStore, State, withStore} from './testlib';
import {createWrapper} from '../src';
import {Store} from 'redux';

let store: Store;

const defaultState = {reduxStatus: 'init'};
const modifiedState = {...defaultState, modified: true};

//TODO https://github.com/testing-library/react-hooks-testing-library/issues/649

describe('client integration', () => {
    describe.skip('existing store is taken from window', () => {
        beforeEach(() => {
            store = makeStore({} as any);
        });

        test('withRedux', async () => {
            const WrappedPage: any = withStore(wrapper)(DummyComponent);
            expect(child(<WrappedPage initialState={store.getState()} />)).toEqual('{"props":{},"state":{"reduxStatus":"init"}}');
        });

        test('API functions', async () => {
            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(s => () => null as any);
            expect(await withStore(wrapper)(Page)?.getInitialProps({} as any)).toEqual({
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        Page.getInitialProps = w.getInitialPageProps(s => () => {
            // when invoked below, verify that state modification is retained in getInitialProps
            expect(s.getState()).toEqual(modifiedState);
        });

        const Wrapped: any = withStore(wrapper)(Page);

        act(() => {
            create(<Wrapped />);
        });

        // expected when invoked above
        await withStore(wrapper)(Page)?.getInitialProps({
            req: {},
            res: {},
            query: true,
            pathname: true,
            AppTree: {},
            resolvedUrl: true,
        } as any);
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

        const Wrapped: any = withStore(w)(Page);

        let renderer: ReactTestRenderer;
        act(() => {
            renderer = create(<Wrapped initialState={{reduxStatus: 'state from server'}} />);
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

        const Wrapped: any = withStore(w)(Page);

        let renderer: ReactTestRenderer;
        act(() => {
            renderer = create(<Wrapped id="1" />);
        });
        act(() => {
            renderer.update(<Wrapped id="2" initialState={{reduxStatus: 'state from server'}} />);
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(renderer!.toJSON()).toEqual(`${stateFromClient} 2`);
    });
});
