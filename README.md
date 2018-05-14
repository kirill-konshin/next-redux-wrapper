Redux wrapper for Next.js
=========================

![Build status](https://travis-ci.org/kirill-konshin/next-redux-wrapper.svg?branch=master)

:warning: This will work only with NextJS 6+ :warning:

If you're looking for a version for NextJS 5 (for individual pages) use [1.x branch](https://github.com/kirill-konshin/next-redux-wrapper/tree/1.x) 
or you can follow these simple [upgrade instructions](#upgrade).

- [Usage](#usage)
- [How it works](#how-it-works)
- [Document](#document)
- [Error Pages](#error-pages)
- [Upgrade](#upgrade)
- [Use with layout](#use-with-layout)
- [Async actions in `getInitialProps`](#async-actions-in-getinitialprops)
- [Custom serialization and deserialization, usage with Immutable.JS](#custom-serialization-and-deserialization)
- [Usage with Redux Persist](#usage-with-redux-persist)
- [Resources](#resources)

## Installation

```bash
npm install next-redux-wrapper@canary --save
```

Wrapper has to be attached your `_app` component (located in `/pages`). All other pages may use regular `connect`
function of `react-redux`.

Here is the minimal setup (`makeStore` and `reducer` usually are located in other files):

```js
// pages/_app.js
import React from "react";
import {createStore} from "redux";
import {Provider} from "react-redux";
import App, {Container} from "next/app";
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
* @param {Request} options.req NodeJS Request object (not set when client applies initialState from server)
* @param {Request} options.res NodeJS Request object (not set when client applies initialState from server)
* @param {boolean} options.debug User-defined debug mode param
* @param {string} options.storeKey This key will be used to preserve store in global namespace for safe HMR 
*/
const makeStore = (initialState, options) => {
    return createStore(reducer, initialState);
};

class MyApp extends App {

    static async getInitialProps({Component, ctx}) {

        // we can dispatch from here too
        ctx.store.dispatch({type: 'FOO', payload: 'foo'});

        const pageProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {};

        return {pageProps};

    }

    render() {
        const {Component, pageProps, store} = this.props;
        return (
            <Container>
                <Provider store={store}>
                    <Component {...pageProps} />
                </Provider>
            </Container>
        );
    }

}

export default withRedux(makeStore)(MyApp);
```

And then actual page components can be simply connected:

```js
import React, {Component} from "react";
import {connect} from "react-redux";

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

export default connect()(Page);
```

## How it works

No magic is involved, it auto-creates Redux store when `getInitialProps` is called by Next.js and then passes this store
down to React Redux's `Provider`, which is used to wrap the original component, also automatically. On the client side
it also takes care of using same store every time, whereas on server new store is created for each request.

The `withRedux` function accepts `makeStore` as first argument. The `makeStore` function will receive initial state and
should return a new instance of Redux `store` each time when called, no memoization needed here, it is automatically done
inside the wrapper.

`withRedux` also optionally accepts a config object as second paramter:

- `storeKey` (optional, string) : the key used on `window` to persist the store on the client
- `debug` (optional, boolean) : enable debug logging
- `serializeState` and `deserializeState`: custom functions for serializing and deserializing the redux state, see
    [Custom serialization and deserialization](#custom-serialization-and-deserialization).

When `makeStore` is invoked it is provided with a configuration object along with NextJS page context which includes:

- `isServer` (boolean): `true` if called while on the server rather than the client
- `req` (Request): The `next.js` `getInitialProps` context `req` parameter
- `res` (Request): The `next.js` `getInitialProps` context `req` parameter

Additional config properties `req` and `res` are not set when client applies `initialState` from server.

Although it is possible to create server or client specific logic in both `makeStore` function and `getInitialProps`
method I highly don't recommend to have different behavior. This may cause errors and checksum mismatches which in turn
will ruin the whole purpose of server rendering.

## Document

I don't recommend to use `withRedux` in `pages_document.js`, Next.JS [does not provide](https://github.com/zeit/next.js/issues/1267)
a reliable way to determine the sequence when components will be rendered. So per Next.JS recommendation it is better
to have just data-agnostic things in `pages/_document`. 

## Error Pages

Error pages also can be wrapped the same way as any other pages.

Transition to an error page (`pages/_error.js` template) will cause `pages/_app.js` to be applied but it is always a
full page transition (not HTML5 pushstate), so client will have store created from scratch using state from the server,
so unless you persist the store on client somehow the resulting previous client state will be ignored. 

## Upgrade

If your project was using NextJS 5 and Next Redux Wrapper 1.x these instructions will help you to upgrade to latest
version.

1. Upgrade NextJS and Wrapper
    ```bash
    $ npm install next@6 --save-dev
    $ npm install next-redux-wrapper@2 --save
   ```
   
2. Replace all usages of `import withRedux from "next-redux-wrapper";` and `withRedux(...)(WrappedComponent)` in all
    your pages with plain React Redux `connect` HOC:
    
    ```js
    import {connect} from "react-redux";
    
    export default connect(...)(WrappedComponent);
    ```
    
    You also may have to reformat your wrapper object-based config to simple React Redux config.
    
3. Create the `pages/_app.js` file with the following minimal code:

    ```js
    // pages/_app.js
    import React from 'react'
    import {Provider} from "react-redux";
    import App, {Container} from "next/app";
    import withRedux from "next-redux-wrapper";
    import {makeStore} from "../components/store";
    
    export default withRedux(makeStore, {debug: true})(class MyApp extends App {
    
        static async getInitialProps({Component, ctx}) {
            return {
                pageProps: {
                    // Call page-level getInitialProps
                    ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
                }
            };
        }
    
        render() {
            const {Component, pageProps, store} = this.props;
            return (
                <Container>
                    <Provider store={store}>
                        <Component {...pageProps} />
                    </Provider>
                </Container>
            );
        }
    
    });
    ```

4. Follow [NextJS 6 upgrade instructions](https://github.com/zeit/next.js/issues/4239) for all your components
    (`props.router` instead of `props.url` and so on)
    
That's it, your project should now work same as before. 

## Use with layout

`MyApp` is not connected to Redux by design in order to keep the interface as minimal as possible, you can return
whatever you want from `MyApp`'s `getInitialProps`, or if you need a shared layout just create it and `connect` it as
usual, then include it either in the page itself or render in `MyApp` like so:

```js
import React from 'react'
import {Provider} from "react-redux";
import App, {Container} from "next/app";
import withRedux from "next-redux-wrapper";
import {makeStore} from "../components/store";
import ConnectedLayout from "../components/Layout";

export default withRedux(makeStore, {debug: true})(class MyApp extends App {

    static async getInitialProps({Component, ctx}) {

        return {
            pageProps: {
                // Call page-level getInitialProps
                ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {})
            }
        };

    }

    render() {
        const {Component, pageProps} = this.props;
        return (
            <Container>
                <Provider store={store}>
                    <ConnectedLayout>
                        <Component {...pageProps} />
                    </ConnectedLayout>
                </Provider>
            </Container>
        );
    }

});
```

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

If you are storing complex types such as Immutable.JS or EJSON objecs in your state, a custom serialize and deserialize
handler might be handy to serialize the redux state on the server and derserialize it again on the client. To do so,
provide `serializeState` and `deserializeState` as config options to `withRedux`.

The reason is that `initialState` is transferred over the network from server to client as a plain object.

Example of a custom serialization of an Immutable.JS state using `json-immutable`:

```js
const {serialize, deserialize} = require('json-immutable');

withRedux(
    (initialState, options) => {...}, // makeStore
    {
        serializeState: state => serialize(state),
        deserializeState: state => deserialize(state)
    }
);
```

## Usage with Redux Persist

Honestly, I think that putting a persistence gate is not necessary because server can already send *some* HTML with
*some* state, so it's better to show it right away and then wait for `REHYDRATE` action to happen to show additional
delta coming from persistence storage. That's why we use Server Side Rendering in a first place.

But, for those who actually want to block the UI while rehydration is happening, here is the solution (still hacky though).

```js
// lib/redux.js
import logger from 'redux-logger';
import {applyMiddleware, createStore} from 'redux';

const SET_CLIENT_STATE = 'SET_CLIENT_STATE';

export const reducer = (state, {type, payload}) => {
    if (type === SET_CLIENT_STATE) {
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

And then in NextJS `_app` page:

```js
// pages/_app.js
import React from "react";
import {Provider} from "react-redux";
import App, {Container} from "next/app";
import withRedux from "next-redux-wrapper";
import {makeStore} from "./lib/redux";
import {PersistGate} from 'redux-persist/integration/react';

export default withRedux(makeStore, {debug: true})(class MyApp extends App {

    render() {
        const {Component, pageProps, store} = this.props;
        return (
            <Container>
                <Provider store={store}>
                    <PersistGate persistor={store.__persistor} loading: {<div>Loading</div>}>
                        <Component {...pageProps} />
                    </PersistGate>
                </Provider>
            </Container>

        );
    }

});

```

And then in NextJS page:

```js
// pages/index.js
import React from "react";
import {connect} from "react-redux";

export default connect(
    (state) => state,
    {setClientState}
)(({fromServer, fromClient, setClientState}) => (
    <div>
        <div>fromServer: {fromServer}</div>
        <div>fromClient: {fromClient}</div>
        <div><button onClick={e => setClientState('bar')}>Set Client State</button></div>
    </div>
));
```

## Resources

* [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
* [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
* Redux Saga Example: https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e.
* [Typescript type definitions](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/next-redux-wrapper) > `npm install @types/next-redux-wrapper`
