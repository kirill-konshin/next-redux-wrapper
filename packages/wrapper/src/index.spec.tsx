import React from 'react';
import withRedux from '../src/index';
import {verifyComponent, makeStore, NoStorePage, SyncPage} from './testlib';

describe('client integration', () => {
    test('store taken from window', async () => {
        const WrappedPage = withRedux(makeStore, {storeKey: 'testStoreKey'})(NoStorePage);
        const store = makeStore({});
        window['testStoreKey'] = store;
        await store.dispatch({type: 'FOO', payload: 'foo'});
        await verifyComponent(WrappedPage);
    });
    test('store not taken from window', async () => {
        const WrappedPage = withRedux(makeStore, {storeKey: 'testStoreKey'})(SyncPage);
        await verifyComponent(WrappedPage);
    });
});
