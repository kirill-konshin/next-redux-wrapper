import * as React from 'react';
import {create} from 'react-test-renderer';
import {applyMiddleware, createStore, AnyAction} from 'redux';
import {useSelector} from 'react-redux';
import promiseMiddleware from 'redux-promise-middleware';
import {createWrapper, HYDRATE} from '../src';
import {RouterContext} from 'next/dist/shared/lib/router-context';

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
        case 'MODIFY_STATE':
            return {...state, modified: true};
        default:
            return state;
    }
};

export const makeStore = () => createStore(reducer, undefined, applyMiddleware(promiseMiddleware));

export const wrapper = createWrapper(makeStore);

export const DummyComponent: React.ComponentType<any> = (props: any) => {
    const state = useSelector((s: State) => s);
    return <div>{JSON.stringify({props, state})}</div>;
};

export const child = (cmp: any) => (create(cmp)?.toJSON() as any)?.children?.[0];

export const Router = ({asPath = '/foo', children}: any) => (
    <RouterContext.Provider value={{asPath} as any}>{children}</RouterContext.Provider>
);
