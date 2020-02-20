import {AppContext} from 'next/app';
import {applyMiddleware, createStore, AnyAction} from 'redux';
import promiseMiddleware from 'redux-promise-middleware';
import * as React from 'react';
import {create} from 'react-test-renderer';
import {ReduxWrapperAppProps} from '../src';

export interface State {
    reduxStatus?: string;
    custom?: string;
}

export const reducer = (state: State = {reduxStatus: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        default:
            return state;
    }
};

export const makeStore = (initialState: State) =>
    createStore(reducer, initialState, applyMiddleware(promiseMiddleware));

class SyncPageBase extends React.Component<ReduxWrapperAppProps<State>> {
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
export const createAppContext = (): AppContext =>
    ({
        ctx: {
            pathname: '/',
            req: {},
            res: {},
            query: {},
        },
    } as AppContext);

export async function verifyComponent(WrappedPage: any) {
    // this is called by Next.js
    const props = await WrappedPage.getInitialProps(createAppContext());

    expect(props.initialProps.custom).toBe('custom');
    expect(props.initialState.reduxStatus).toBe('foo');

    // this is called by Next.js
    const component = create(<WrappedPage {...props} />);

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
}
