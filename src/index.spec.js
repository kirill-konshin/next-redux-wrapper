import React from "react";
import {applyMiddleware, createStore} from "redux";
import promiseMiddleware from "redux-promise-middleware";
import renderer from "react-test-renderer";
import withRedux from "./index";

global.window = {}; //FIXME Move to test env https://github.com/smooth-code/jest-puppeteer#extend-puppeteerenvironment

const reducer = (state = {reduxStatus: 'init'}, action) => {
    switch (action.type) {
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        default:
            return state
    }
};

const makeStore = (initialState) => createStore(reducer, initialState, applyMiddleware(promiseMiddleware()));

class SyncPage extends React.Component {

    static getInitialProps({ctx}) {
        ctx.store.dispatch({type: 'FOO', payload: 'foo'});
        return {custom: 'custom'};
    }

    render() {
        const {store, ...props} = this.props;
        return (
            <div>
                {JSON.stringify(props)}
                {JSON.stringify(store.getState())}
            </div>
        )
    }

}

const someAsyncAction = ({
    type: 'FOO',
    payload: new Promise(res => res('foo'))
});

class AsyncPage extends SyncPage {
    static async getInitialProps({ctx}) {
        await ctx.store.dispatch(someAsyncAction);
        return {custom: 'custom'};
    }
}

async function verifyComponent(WrappedPage) {

    // this is called by Next.js
    const props = await WrappedPage.getInitialProps();

    expect(props.initialProps.custom).toBe('custom');
    expect(props.initialState.reduxStatus).toBe('foo');

    // this is called by Next.js
    const component = renderer.create(<WrappedPage {...props}/>);

    let tree = component.toJSON();
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
    beforeEach(() => {
        delete window.__NEXT_REDUX_STORE__;
    });
    
    test('custom state serialization on the server', async () => {
        const WrappedPage = withRedux(makeStore, {
            serializeState: state => ({ ...state, serialized: true })
        })(AsyncPage);
        
        const props = await WrappedPage.getInitialProps();
        expect(props.initialState.serialized).toBeTruthy();
    });
    
    test('custom state deserialization on the client', async () => {
        const WrappedPage = withRedux(makeStore, {
            deserializeState: state => ({ ...state, deserialized: true })
        })(AsyncPage);
        
        renderer.create(<WrappedPage />);
        expect(window.__NEXT_REDUX_STORE__.getState().deserialized).toBeTruthy();
        
    });
});