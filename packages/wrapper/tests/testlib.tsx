import * as React from 'react';
import {create} from 'react-test-renderer';
import {applyMiddleware, createStore, AnyAction} from 'redux';
import {useSelector} from 'react-redux';
import promiseMiddleware from 'redux-promise-middleware';
import {createWrapper, HYDRATE} from '../src';

export interface State {
    reduxStatus?: string;
    custom?: string;
}

export const reducer = (state: State = {reduxStatus: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case HYDRATE:
            return {...state, ...action.payload};
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        default:
            return state;
    }
};

export const makeStore = () => createStore(reducer, undefined, applyMiddleware(promiseMiddleware));

export const wrapper = createWrapper(makeStore, {storeKey: 'testStoreKey'});

export const DummyComponent = (props: any) => {
    const state = useSelector((state: State) => state);
    return <div>{JSON.stringify({props, state})}</div>;
};

export const child = (cmp: any) => create(cmp)?.toJSON()?.children?.[0];
