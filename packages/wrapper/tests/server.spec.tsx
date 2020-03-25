import * as React from 'react';
import {create} from 'react-test-renderer';
import {useSelector} from 'react-redux';
import {createWrapper} from '../src';
import {AsyncPage, makeStore, SyncPage, verifyComponent, State, wrapper} from './testlib';
import {NextPageContext} from 'next';

describe('store integration', () => {
    test('simple', async () => {
        const WrappedPage = wrapper.withRedux(SyncPage);
        await verifyComponent(WrappedPage);
    });

    test('async', async () => {
        const WrappedPage = wrapper.withRedux(AsyncPage);
        await verifyComponent(WrappedPage);
    });
});

describe('custom serialization', () => {
    test('custom state serialization on the server and deserialization on the client', async () => {
        const wrapper = createWrapper(makeStore, {
            serializeState: (state: any) => ({...state, serialized: true}),
            deserializeState: (state: any) => ({...state, deserialized: true}),
            debug: true,
        });

        const props = await wrapper.getInitialPageProps()({} as NextPageContext);

        expect(props.initialState.serialized).toBeTruthy();

        const MyApp = wrapper.withRedux(() => {
            const state = useSelector((state: State) => state);
            return <div>{JSON.stringify(state)}</div>;
        });

        const component = create(<MyApp {...props} />);

        const tree = component.toJSON();
        expect(tree).toMatchSnapshot();
    });
});
