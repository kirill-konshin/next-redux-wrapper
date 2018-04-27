Redux wrapper for Next.js
=========================

![Build status](https://travis-ci.org/kirill-konshin/next-redux-wrapper.svg?branch=master)

- [Usage](#usage)
- [How it works](#how-it-works)
- [Hot Reload](#hot-reload)
- [Async actions in `getInitialProps`](#async-actions-in-getinitialprops)
- [Usage with Immutable.JS](#usage-with-immutablejs)
- [Usage with Redux Persist](#usage-with-redux-persist)
- [Resources](#resources)

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

`withRedux` also optionally accepts an object. In this case only 1 parameter is passed which can contain the following
configuration properties:

- `createStore` (required, function) : the `makeStore` function as described above
- `storeKey` (optional, string) : the key used on `window` to persist the store on the client
- `debug` (optional, boolean) : enable debug logging
- `mapStateToProps`, `mapDispatchToProps`, `mergeProps` (optional, functions) : functions to pass to `react-redux` `connect` method
- `connectOptions` (optional, object) : configuration to pass to `react-redux` `connect` method
- `serializeState` and `deserializeState` : Custom functions for serializing and deserializing the redux state, see [Custom serialization and deserialization](#custom-serialization-and-deserialization)

When `makeStore` is invoked it is also provided a configuration object as the second parameter, which includes:

- `isServer` (boolean): `true` if called while on the server rather than the client
- `req` (Request): The `next.js` `getInitialProps` context `req` parameter
- `query` (object): The `next.js` `getInitialProps` context `query` parameter

The object also includes all configuration as passed to `withRedux` if called with an object of configuration properties.

**Use `withRedux` to wrap only top level pages! All other components should keep using regular `connect` function of
React Redux.**

Although it is possible to create server or client specific logic in both `createStore` function and `getInitialProps`
method I highly don't recommend to have different behavior. This may cause errors and checksum mismatches which in turn
will ruin the whole purpose of server rendering.

I don't recommend to use `withRedux` in both top level pages and `_document.js` files, Next.JS
[does not have provide](https://github.com/zeit/next.js/issues/1267) a reliable way to determine the sequence when
components will be rendered. So per Next.JS recommendation it is better to have just data-agnostic things in `_document`
and wrap top level pages with another HOC that will use `withRedux`. 

## Hot Reload

Hot reloading of React components is still a very challenging thing.

Sometimes it works out of the box but in some cases it does not. For such cases currently the recommendation is to keep
pages and actual components separate and manually set up hot reloading:

```js
import withRedux from 'next-redux-wrapper';
import {makeStore} from './components/store'

import Page from '../lib/component';

if (module.hot) {
  module.hot.accept('../lib/component', () => {
    require('../lib/component');
  });
}

export default withRedux(makeStore)(Page);
```

For hot reloading of reducers please see the demo.

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

## Custom serialization and deserialization

If you are storing complex types such as Immutable.JS or EJSON objecs in your state, a custom serialize and deserialize handler might be handy to serialize the redux state on the server and derserialize it again on the client. To do so, provide `serializeState` and `deserializeState` as config options to `withRedux`.
The reason why this is necessary is that `initialState` is transferred over the network from server to client as a plain object.

Example of a custom serialization of an Immutable.JS state using `json-immutable`:

```js
const { serialize, deserialize } = require('json-immutable');
withRedux({
   createStore: function makeStore(initialState = {}) {...},
   serializeState: state => serialize(state),
   deserializeState: state => deserialize(state)
});
```

## Usage with Redux Persist

Honestly, I think that putting a persistence gate is not necessary because server can already send *some* HTML with *some* state, so it's better to show it right away and then wait for `REHYDRATE` action to happen to show additional delta coming from persistence storage. That's why we use Server Side Rendering in a first place.

But, for those who actually want to block the UI while rehydration is happening, here is the solution (still hacky though).

```js
// lib/redux.js
import logger from 'redux-logger';
import {applyMiddleware, createStore} from 'redux';

const SET_CLIENT_STATE = 'SET_CLIENT_STATE';

export const reducer = (state, {type, payload}) => {
    if (type == SET_CLIENT_STATE) {
        return {
            ...state,
            fromClient: payload
        };
    }
    return state;
};

const makeConfiguredStore = (reducer, initialState) =>
    createStore(reducer, initialState, applyMiddleware(logger));

export const makeStore = (initialState, {isServer, req, debug, storeKey}) => {

    if (isServer) {

        initialState = initialState || {fromServer: 'foo'};

        return makeConfiguredStore(reducer, initialState);

    } else {

        // we need it only on client side
        const {persistStore, persistReducer} = require('redux-persist');
        const storage = require('redux-persist/lib/storage').default;

        const persistConfig = {
            key: 'nextjs',
            whitelist: ['fromClient'], // make sure it does not clash with server keys
            storage
        };

        const persistedReducer = persistReducer(persistConfig, reducer);
        const store = makeConfiguredStore(persistedReducer, initialState);

        store.__persistor = persistStore(store); // Nasty hack

        return store;
    }
};

export const setClientState = (clientState) => ({
    type: SET_CLIENT_STATE,
    payload: clientState
});
```

Next, a HOC to for `PersistGate`:

```js
// lib/withPersistGate.js
import React from 'react';
import PropTypes from 'prop-types';
import {PersistGate} from 'redux-persist/integration/react';

export default (gateProps = {}) => (WrappedComponent) => (

    class WithPersistGate extends React.Component {

        static displayName = `withPersistGate(${WrappedComponent.displayName
                                                || WrappedComponent.name
                                                || 'Component'})`;
        static contextTypes = {
            store: PropTypes.object.isRequired
        };

        constructor(props, context) {
            super(props, context);
            this.store = context.store;
        }

        render() {
            return (
                <PersistGate {...gateProps} persistor={this.store.__persistor}>
                    <WrappedComponent {...this.props} />
                </PersistGate>
            );
        }

    }

);
```

And then in NextJS page:

```js
// pages/index.js
import React from "react";
import withRedux from "next-redux-wrapper";
import {setClientState, makeStore} from "../lib/redux";
import withPersistGate from "../lib/withPersistGate";

export const Index = ({fromServer, fromClient, setClientState}) => (
    <div>
        <div>fromServer: {fromServer}</div>
        <div>fromClient: {fromClient}</div>
        <div><button onClick={e => setClientState('bar')}>Set Client State</button></div>
    </div>
);

export default withRedux(
    makeStore,
    (state) => state,
    {setClientState}
)(withPersistGate({
    loading: (<div>Loading</div>)
})(Index));
```

Note the order of HOCs, `withRedux` must be on top, before `withPersistGate`.

## Resources

* [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
* [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
* Redux Saga Example: https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e.
* [Typescript type definitions](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/next-redux-wrapper) > `npm install @types/next-redux-wrapper`
