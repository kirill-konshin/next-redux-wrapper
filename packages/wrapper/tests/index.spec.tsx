import React, {Component} from 'react';
import {applyMiddleware, createStore} from 'redux';
import promiseMiddleware from 'redux-promise-middleware';
import renderer from 'react-test-renderer';
import {NextAppContext} from 'next/app';
import withRedux from '../src/index';

interface NextAppContextTest extends NextAppContext {
    ctx: any;
}

const appCtx: NextAppContextTest = {ctx: {}, Component: null, router: null};

const reducer = (state = {reduxStatus: 'init'}, action) => {
    switch (action.type) {
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        default:
            return state;
    }
};

const makeStore = initialState => createStore(reducer, initialState, applyMiddleware(promiseMiddleware()));

class SyncPageBase extends Component {
    props; //FIXME TS Crap

    render() {
        const {store, ...props} = this.props;
        return (
            <div>
                {JSON.stringify(props)}
                {JSON.stringify(store.getState())}
            </div>
        );
    }
}
class SyncPage extends SyncPageBase {
    static getInitialProps({ctx}) {
        ctx.store.dispatch({type: 'FOO', payload: 'foo'});
        return {custom: 'custom'};
    }
}

const someAsyncAction = {
    type: 'FOO',
    payload: new Promise(res => res('foo'))
};

class AsyncPage extends SyncPageBase {
    static async getInitialProps({ctx}) {
        await ctx.store.dispatch(someAsyncAction);
        return {custom: 'custom'};
    }
}

async function verifyComponent(WrappedPage) {
    // this is called by Next.js
    const props = await WrappedPage.getInitialProps(appCtx);

    expect(props.initialProps.custom).toBe('custom');
    expect(props.initialState.reduxStatus).toBe('foo');

    // this is called by Next.js
    const component = renderer.create(<WrappedPage {...props} />);

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
}

test('simple store integration', async () => {
    const WrappedPage = withRedux(makeStore)(SyncPage);
    await verifyComponent(WrappedPage);
});

test('async store integration', async () => {
    const WrappedPage = withRedux(makeStore)(AsyncPage);
    await verifyComponent(WrappedPage);
});

describe('custom serialization', () => {
    test('custom state serialization on the server and deserialization on the client', async () => {
        class MyApp extends Component {
            props;

            render() {
                const {store} = this.props;
                return <div>{JSON.stringify(store.getState())}</div>;
            }
        }

        const WrappedPage = withRedux(makeStore, {
            serializeState: state => ({...state, serialized: true}),
            deserializeState: state => ({...state, deserialized: true})
        })(MyApp);

        const props = await WrappedPage.getInitialProps(appCtx);
        expect(props.initialState.serialized).toBeTruthy();

        const component = renderer.create(<WrappedPage {...props} />);

        const tree = component.toJSON();
        expect(tree).toMatchSnapshot();
    });
});
