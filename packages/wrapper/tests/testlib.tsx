import * as React from 'react';
import {create} from 'react-test-renderer';
import {applyMiddleware, createStore, AnyAction} from 'redux';
import {Provider, useSelector} from 'react-redux';
import promiseMiddleware from 'redux-promise-middleware';
import {createWrapper, MakeStore} from '../src';

export interface State {
    reduxStatus?: string;
    custom?: string;
}

export const reducer = (state: State = {reduxStatus: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        case 'MODIFY_STATE':
            return {...state, modified: true};
        default:
            return state;
    }
};

export const makeStore: MakeStore<any> = ({reduxWrapperMiddleware}) =>
    createStore(reducer, undefined, applyMiddleware(promiseMiddleware, reduxWrapperMiddleware));

export const wrapper = createWrapper(makeStore);

export const DummyComponent: React.ComponentType<any> = (props: any) => {
    (props.wrapper || wrapper).useHydration(props);
    const state = useSelector((s: State) => s);
    return <div>{JSON.stringify({props, state})}</div>;
};

export const child = (cmp: any) => (create(cmp)?.toJSON() as any)?.children?.[0];

export const withStore = (w: any) => (Component: any) => {
    const WrappedComponent = (props: any) => (
        <Provider store={w.useStore()}>
            <Component {...props} />
        </Provider>
    );

    WrappedComponent.displayName = `withRedux(${Component.displayName || Component.name || 'Component'})`;

    // also you can use hoist-non-react-statics package
    if ('getInitialProps' in Component) {
        WrappedComponent.getInitialProps = Component.getInitialProps;
    }

    return WrappedComponent;
};
