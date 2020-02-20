/**
 * @jest-environment jsdom
 **/

import withRedux from '../src';
import {verifyComponent, makeStore, NoStorePage, SyncPage} from './testlib';

describe('client integration', () => {
    test('store taken from window', async () => {
        const WrappedPage = withRedux(makeStore, {storeKey: 'testStoreKey'})(NoStorePage);
        const store = makeStore({});
        (window as any)['testStoreKey'] = store;
        store.dispatch({type: 'FOO', payload: 'foo'});
        await verifyComponent(WrappedPage);
    });
    test('store not taken from window', async () => {
        const WrappedPage = withRedux(makeStore, {storeKey: 'testStoreKey'})(SyncPage);
        await verifyComponent(WrappedPage);
    });
});
