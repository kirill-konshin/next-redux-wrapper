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

test('simple props', () => {

    const App = ({foo}) => (<div>{foo}</div>);
    const WrappedApp = wrapper(makeStore, state => state)(App);

    const component = renderer.create(<WrappedApp foo="foo"/>);
    expect(component.toJSON()).toMatchSnapshot();

});