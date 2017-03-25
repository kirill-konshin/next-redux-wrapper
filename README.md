Redux wrapper for Next.js
=========================

## Usage

```bash
npm install next-redux-wrapper --save
```

Wrapper has to be attached your page components (located in `/pages`). For safety it is recommended
to wrap all pages, no matter if they use Redux or not, so that you should not care about it anymore in
all child components.

Here is the minimal setup (`makeStore` and `reducer` usually are located in other files):

```js
import React, {Component} from "react";
import {createStore} from "redux";
import withRedux from "next-redux-wrapper";

const reducer = (state = {foo: ''}, action) => {
    switch (action.type) {
        case 'FOO':
            return {...state, foo: action.payload};
        default:
            return state
    }
};

const makeStore = (initialState) => {
    return createStore(reducer, initialState);
};

class Page extends Component {
    static getInitialProps({store, isServer, pathname, query}) {
        store.dispatch({type: 'FOO', payload: 'foo'}); // component will be able to read from store's state when rendered
        return {custom: 'custom'}; // you can pass some custom props to component from here
    }
    render() {
        return (
            <div>
                <div>Prop from Redux {this.props.foo}</div>
                <div>Prop from getInitialProps {this.props.custom}</div>
            </div>
        )
    }
}

Page = withRedux(makeStore, (state) => ({foo: state.foo}))(Page);

export default Page;
```

## How it works

No magic is involved, it auto-creates Redux store when `getInitialProps` is called by Next.js and then passes this store
down to React Redux's `Provider`, which is used to wrap the original component, also automatically. On the client side
it also takes care of using same store every time, whereas on server new store is created for each request.

The `withRedux` function accepts `makeStore` as first argument, all other arguments are internally passed to React
Redux's `connect()` function for simplicity. The `makeStore` function will receive initial state as one argument and
should return a new instance of redux store each time when called, no memoization needed here, it is automatically done
inside the wrapper.


## Async actions in `getInitialProps`

```js
function someAsyncAction() {
    return {
        type: 'FOO',
        payload: new Promise((res) => { res('foo'); })
    }
}

function getInitialProps({store, isServer, pathname, query}) {
    
    // lets create an action using creator
    const action = someAsyncAction();
    
    // now the action has to be dispatched
    store.dispatch(action);
    
    // once the payload is available we can resume and render the app
    return action.payload.then((payload) => {
        // you can do something with payload now
        return {custom: 'custom'}; 
    });
    
}
```