import {applyMiddleware, createStore, AnyAction} from 'redux';
import {useSelector} from 'react-redux';
import promiseMiddleware from 'redux-promise-middleware';
import * as React from 'react';
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

export const makeStoreStub = (state: any = null): any =>
    jest.fn(() => ({
        getState: jest.fn(() => state),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
    }));

export const wrapper = createWrapper(makeStore, {storeKey: 'testStoreKey'});

export const DummyComponent = (props: any) => {
    const state = useSelector((state: State) => state);
    return <div>{JSON.stringify({props, state})}</div>;
};
