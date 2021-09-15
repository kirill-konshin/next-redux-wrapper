/**
 * @jest-environment jsdom
 **/

import * as React from 'react';
import {useDispatch} from 'react-redux';
import {create, act} from 'react-test-renderer';
import {DummyComponent, wrapper, child, makeStore} from './testlib';
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
            expect(child(<WrappedPage initialState={store.getState()} />)).toEqual('{"props":{},"state":{"reduxStatus":"init"}}');
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
            create(<Wrapped />);
        });

        // expected when invoked above
        await w.withRedux(Page)?.getInitialProps({} as any);
    });
});
