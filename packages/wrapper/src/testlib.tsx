import {AppContext} from 'next/app';
import {applyMiddleware, createStore, AnyAction} from 'redux';
import promiseMiddleware from 'redux-promise-middleware';
import React, {Component} from 'react';
import renderer from 'react-test-renderer';

export const reducer = (state = {reduxStatus: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        default:
            return state;
    }
};

export const makeStore = (initialState: any) => createStore(reducer, initialState, applyMiddleware(promiseMiddleware));

class SyncPageBase extends Component<any> {
    public render() {
        const {store, ...props} = this.props;
        return (
            <div>
                {JSON.stringify(props)}
                {JSON.stringify(store.getState())}
            </div>
        );
    }
}

export class SyncPage extends SyncPageBase {
    public static getInitialProps({ctx}: AppContext) {
        ctx.store.dispatch({type: 'FOO', payload: 'foo'});
        return {custom: 'custom'};
    }
}

const someAsyncAction = {
    type: 'FOO',
    payload: new Promise(res => res('foo')),
};

export class AsyncPage extends SyncPageBase {
    public static async getInitialProps({ctx}: AppContext) {
        await ctx.store.dispatch(someAsyncAction);
        return {custom: 'custom'};
    }
}

export class NoStorePage extends SyncPageBase {
    public static async getInitialProps() {
        return {custom: 'custom'};
    }
}

/**
 * Creates a stub AppContext declared as any
 */
export function createAppContext(): any {
    return {
        ctx: {
            pathname: '/',
            req: {},
            res: {},
            query: {},
        },
    };
}

export async function verifyComponent(WrappedPage: any) {
    // this is called by Next.js
    const props = await WrappedPage.getInitialProps(createAppContext());

    expect(props.initialProps.custom).toBe('custom');
    expect(props.initialState.reduxStatus).toBe('foo');

    // this is called by Next.js
    const component = renderer.create(<WrappedPage {...props} />);

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
}
