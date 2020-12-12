/**
 * @jest-environment jsdom
 **/

import * as React from 'react';
import {DummyComponent, wrapper, child, makeStore} from './testlib';
import {createWrapper} from '../src';
import {Store} from 'redux';

const w: {testStoreKey?: Store} = window as any;

const defaultState = {reduxStatus: 'init'};

describe('client integration', () => {
    afterEach(() => {
        delete w.testStoreKey;
    });

    describe('existing store is taken from window', () => {
        beforeEach(() => {
            w.testStoreKey = makeStore();
        });

        test('withRedux', async () => {
            const WrappedPage: any = wrapper.withRedux(DummyComponent);
            expect(child(<WrappedPage initialState={w.testStoreKey?.getState()} />)).toEqual(
                '{"props":{},"state":{"reduxStatus":"init"}}',
            );
        });

        test('API functions', async () => {
            const Page = () => null;
            Page.getInitialProps = wrapper.getInitialPageProps(store => () => null);
            expect(await wrapper.withRedux(Page)?.getInitialProps({} as any)).toEqual({
                initialProps: {},
                initialState: defaultState,
            });
        });
    });

    test('store is available in window when created', async () => {
        const wrapper = createWrapper(makeStore, {storeKey: 'testStoreKey'});
        const Page = () => null;
        Page.getInitialProps = wrapper.getInitialPageProps(store => () => null);
        await wrapper.withRedux(Page)?.getInitialProps({} as any);
        expect(w.testStoreKey?.getState()).toEqual(defaultState);
    });
});
