/**
 * @jest-environment jsdom
 **/

import * as React from 'react';
import {create} from 'react-test-renderer';
import {makeStoreStub, DummyComponent, wrapper} from './testlib';
import {createWrapper} from '../src';
import {Store} from 'redux';
// import {act} from 'react-dom/test-utils';

const w: {testStoreKey: Store} = window as any;

describe('client integration', () => {
    afterEach(() => {
        delete w.testStoreKey;
    });

    describe('store taken from window', () => {
        beforeEach(() => {
            w.testStoreKey = makeStoreStub({state: 'val'})();
        });

        test('withRedux', async () => {
            const WrappedPage: any = wrapper.withRedux(DummyComponent);
            expect(create(<WrappedPage initialState={w.testStoreKey.getState()} />).toJSON()).toMatchSnapshot();
        });

        test('API functions', async () => {
            expect(await wrapper.getInitialPageProps()({} as any)).toMatchSnapshot();
        });
    });

    test('store is put to window when created', async () => {
        const wrapper = createWrapper(makeStoreStub({baz: 'qux'}), {storeKey: 'testStoreKey'});
        expect(await wrapper.getInitialPageProps()({} as any)).toMatchSnapshot();
        expect(w.testStoreKey.getState()).toMatchSnapshot();
    });
});
