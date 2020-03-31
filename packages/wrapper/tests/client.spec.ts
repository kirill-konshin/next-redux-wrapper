/**
 * @jest-environment jsdom
 **/

import {verifyComponent, makeStore, NoStorePage, SyncPage, wrapper} from './testlib';
import {act} from 'react-dom/test-utils';

describe('client integration', () => {
    test('store taken from window', async () => {
        const WrappedPage = wrapper.withRedux(NoStorePage);
        const store = makeStore();
        (window as any)['testStoreKey'] = store;
        act(() => {
            store.dispatch({type: 'FOO', payload: 'foo'});
        });
        await verifyComponent(WrappedPage);
    });
    test('store not taken from window', async () => {
        const WrappedPage = wrapper.withRedux(SyncPage);
        await verifyComponent(WrappedPage);
    });
});
