import React from "react";
import {applyMiddleware, createStore} from "redux";
import promiseMiddleware from "redux-promise-middleware";
import renderer from "react-test-renderer";
import wrapper from "./index";

const reducer = (state = {reduxStatus: 'init'}, action) => {
    switch (action.type) {
        case 'FOO': // sync
        case 'FOO_FULFILLED': // async
            return {reduxStatus: action.payload};
        default:
            return state
    }
};

const makeStore = (initialState) => {
    return createStore(reducer, initialState, applyMiddleware(promiseMiddleware()));
};

class SyncPage extends React.Component {

    static getInitialProps({store}) {
        store.dispatch({type: 'FOO', payload: 'foo'});
        return {custom: 'custom'};
    }

    render() {
        return (
            <div>
                <div className="redux">{this.props.reduxStatus}</div>
                <div className="custom">{this.props.custom}</div>
            </div>
        )
    }

}

function someAsyncAction() {
    return {
        type: 'FOO',
        payload: new Promise((res) => { res('foo'); })
    }
}

class AsyncPage extends SyncPage {
    static getInitialProps({store}) {
        const action = someAsyncAction();
        store.dispatch(action);
        return action.payload.then((payload) => {
            return {custom: 'custom'};
        });
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

test('simple store integration', async() => {
    const WrappedPage = wrapper(makeStore, state => state)(SyncPage);
    await verifyComponent(WrappedPage);
});

test('async store integration', async() => {
    const WrappedPage = wrapper(makeStore, state => state)(AsyncPage);
    await verifyComponent(WrappedPage);
});

const spyLog = jest.spyOn(global.console, 'log');

describe('createStore', () => {
    beforeEach(() => {
        spyLog.mockReset();
    });

    afterEach(() => {
        delete window.__NEXT_REDUX_STORE__;
    });

    test('simple props', () => {
        const App = ({foo}) => (<div>{foo}</div>);
        const WrappedApp = wrapper(makeStore, state => state)(App);
        const component = renderer.create(<WrappedApp foo="foo"/>);
        expect(component.toJSON()).toMatchSnapshot();
    });

    test('advanced props', () => {
        const App = ({foo}) => (<div>{foo}</div>);
        const WrappedApp = wrapper({ createStore: makeStore, mapStateToProps: (state) => state })(App);
        const component = renderer.create(<WrappedApp foo="foo"/>);
        expect(component.toJSON()).toMatchSnapshot();
    });

    test('debug mode from options', async () => {
        const App = ({foo}) => (<div>{foo}</div>);
        const WrappedApp = wrapper({
            createStore: (initialState, options) => {
                expect(options.debug).toBe(true);
                return createStore(reducer, initialState, applyMiddleware(promiseMiddleware()));
            },
            debug: true
        })(App);
        const component = renderer.create(<WrappedApp/>);
        await WrappedApp.getInitialProps();
        expect(spyLog).toHaveBeenCalledTimes(3);
        expect(component.toJSON()).toMatchSnapshot();
    });

    test('debug mode with setDebug method', async () => {
        const App = ({foo}) => (<div>{foo}</div>);
        wrapper.setDebug(true);
        const WrappedApp = wrapper((initialState, options) => {
            expect(options.debug).toBe(true);
            return createStore(reducer, initialState, applyMiddleware(promiseMiddleware()));
        })(App);
        const component = renderer.create(<WrappedApp/>);
        await WrappedApp.getInitialProps();
        expect(spyLog).toHaveBeenCalledTimes(3);
        expect(component.toJSON()).toMatchSnapshot();
    });

    test('should throw if no createStore method', async () => {
        const App = ({foo}) => (<div>{foo}</div>);
        expect(() => wrapper({
            debug: true
        })(App)).toThrow();

    });

    test('should be able to configure store key on window', async () => {
        const App = ({foo}) => (<div>{foo}</div>);
        const WrappedApp = wrapper({
            createStore: makeStore,
            storeKey: 'TESTKEY'
        })(App);
        const component = renderer.create(<WrappedApp/>);
        await WrappedApp.getInitialProps();
        expect(window.__NEXT_REDUX_STORE__).not.toBeDefined();
        expect(window.TESTKEY).toBeDefined();
        expect(component.toJSON()).toMatchSnapshot();
        delete window.TESTKEY;
    });

    test('should memoize store on client in window', async() => {
        const App = ({foo}) => (<div>{foo}</div>);
        const App1 = wrapper(makeStore, state => state)(App);
        renderer.create(<App1/>);
        expect(window.__NEXT_REDUX_STORE__).toBeDefined();
        const App2 = wrapper((initialState, options) => {
            throw new Error('New store should not be created!');
        }, state => state)(App);
        renderer.create(<App2 foo="foo"/>);
        expect(window.__NEXT_REDUX_STORE__).toBeDefined();
    });
    
    test('usage of custom state deserialization on client', async () => {
        const App = ({foo}) => (<div>{foo}</div>);
        const App1 = wrapper({
            createStore: makeStore,
            deserializeState: () => ({ deserialized: true })
        }, state => state)(App);
        renderer.create(<App1/>);
        expect(window.__NEXT_REDUX_STORE__.getState).toBeDefined();
        expect(window.__NEXT_REDUX_STORE__.getState()).toHaveProperty('deserialized', true);
    });
});
