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

/**
* @param {object} initialState
* @param {boolean} options.isServer indicates whether it is a server side or client side
* @param {Request} options.req NodeJS Request object (if any)
* @param {boolean} options.debug User-defined debug mode param
* @param {string} options.storeKey This key will be used to preserve store in global namespace for safe HMR 
*/
const makeStore = (initialState, options) => {
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

**Use `withRedux` to wrap only top level pages! All other components should keep using regular `connect` function of
React Redux.**

Although it is possible to create server or client specific logic in both `createStore` function and `getInitialProps`
method I highly don't recommend to have different behavior. This may cause errors and checksum mismatches which in turn
will ruin the whole purpose of server rendering.

I don't recommend to use `withRedux` in both top level pages and `_document.js` files, Next.JS
[does not have provide](https://github.com/zeit/next.js/issues/1267) a reliable way to determine the sequence when
components will be rendered. So per Next.JS recommendation it is better to have just data-agnostic things in `_document`
and wrap top level pages with another HOC that will use `withRedux`. 

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

## Usage with Immutable.JS

If you want to use Immutable.JS then you have to modify your `makeStore` function, it should detect if object is an instance of Immutable.JS, and if not - convert it using `Immutable.fromJS`:

```js
export default function makeStore(initialState = {}) {
    // Nasty duck typing, you should find a better way to detect
    if (!!initialState.toJS) initialState = Immutable.fromJS(initialState);
    return createStore(reducer, initialState, applyMiddleware(thunk));
}
```

The reason is that `initialState` is transferred over the network from server to client as a plain object (it is automatically serialized on server) so it should be converted back to Immutable.JS on client side.

Here you can find better ways to detect if an object is Immutable.JS: https://stackoverflow.com/a/31919454/5125659.

## Resources

* [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
* [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
* Redux Saga Example: https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e.
