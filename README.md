# Redux Wrapper for Next.js  <!-- omit in toc -->

[![npm version](https://badge.fury.io/js/next-redux-wrapper.svg)](https://www.npmjs.com/package/next-redux-wrapper)
![Build status](https://travis-ci.org/kirill-konshin/next-redux-wrapper.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/kirill-konshin/next-redux-wrapper/badge.svg?branch=master)](https://coveralls.io/github/kirill-konshin/next-redux-wrapper?branch=master)


A HOC that brings Next.js and Redux together

:warning: The current version of this library only works with Next.js 9. If you are required to use Next.js 6-8 you can use version 3 of this library. Otherwise, consider upgrading Next.js. :warning:

Next.js 5 (for individual pages) is only compatible with the [1.x branch](https://github.com/kirill-konshin/next-redux-wrapper/tree/1.x). You can upgrade it following these simple [instructions](#upgrade).

This library is not compatible with [Next.js 9's Auto Partial Static Export](https://nextjs.org/blog/next-9#automatic-partial-static-export) feature, see the [explanation below](#automatic-partial-static-export).

Contents:

- [Motivation](#motivation)
- [Installation](#installation)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Tips and Tricks](#tips-and-tricks)
  - [Document](#document)
  - [Error Pages](#error-pages)
  - [Use with layout](#use-with-layout)
  - [Async actions in `getInitialProps`](#async-actions-in-getinitialprops)
  - [Custom serialization and deserialization](#custom-serialization-and-deserialization)
  - [Usage with Redux Saga](#usage-with-redux-saga)
  - [Usage with Redux Persist](#usage-with-redux-persist)
  - [Usage with Redux Hooks](#usage-with-redux-hooks)
- [Automatic Partial Static Export](#automatic-partial-static-export)
- [Upgrade from 1.x](#upgrade-from-1x)
- [Resources](#resources)

## Motivation

Setting up Redux for statically rendered Next.js apps is rather simple: A single Redux store has to be created that is provided to all pages (you won't need this package then).
When SSR is involved, however, things start to get complicated as another store instance is needed on the server to render Redux-connected components.
Furthermore, access to the Redux store may also be needed during a page's `getInitialProps`.

This is where `next-redux-wrapper` comes in handy: It automatically creates the store instances for you and makes sure they all have the same state.

## Installation

```bash
npm install next-redux-wrapper --save
```

The wrapper has to be attached to your `_app` component (located in `/pages`). All other components can use the `connect` function of `react-redux`.

Here is a minimal setup (`makeStore` and `reducer` are usually located in separate files):

<details>
    <summary>JavaScript</summary>

```jsx
// pages/_app.jsx
import React from "react";
import {createStore} from "redux";
import {Provider} from "react-redux";
import App from "next/app";
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
* @param {object} initialState The store's initial state (on the client side, the state of the server-side store is passed here)
* @param {boolean} options.isServer Indicates whether makeStore is executed on the server or the client side
* @param {Request} options.req Node.js `Request` object (only set before `getInitialProps` on the server side)
* @param {Response} options.res Node.js `Response` object (only set before `getInitialProps` on the server side)
* @param {boolean} options.debug User-defined debug flag
* @param {string} options.storeKey The key that will be used to persist the store in the browser's `window` object for safe HMR
*/
const makeStore = (initialState, options) => {
    return createStore(reducer, initialState);
};

class MyApp extends App {
    static async getInitialProps({Component, ctx}) {
        // We can dispatch from here too
        ctx.store.dispatch({type: 'FOO', payload: 'foo'});

        const pageProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {};

        return {pageProps};
    }

    render() {
        const {Component, pageProps, store} = this.props;
        return (
            <Provider store={store}>
                <Component {...pageProps} />
            </Provider>
        );
    }
}

export default withRedux(makeStore)(MyApp);
```
</details>

<details>
    <summary>TypeScript</summary>

```tsx
// pages/_app.tsx
import * as React from "react";
import {createStore} from "redux";
import {Provider} from "react-redux";
import App, {AppContext} from 'next/app';
import withRedux, {ReduxWrapperAppProps, MakeStore} from 'next-redux-wrapper';

interface State {
    foo: string
}

const reducer = (state: State = {foo: ''}, action) => {
    switch (action.type) {
        case 'FOO':
            return {...state, foo: action.payload};
        default:
            return state
    }
};

/**
* @param initialState The store's initial state (on the client side, the state of the server-side store is passed here)
*/
const makeStore: MakeStore = (initialState, options) => {
    return createStore(reducer, initialState);
};

class MyApp extends App<ReduxWrapperAppProps<State>> {
    static async getInitialProps({Component, ctx}: AppContext) {
        // We can dispatch from here too
        ctx.store.dispatch({type: 'FOO', payload: 'foo'});

        const pageProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {};

        return {pageProps};
    }

    render() {
        const {Component, pageProps, store} = this.props;
        return (
            <Provider store={store}>
                <Component {...pageProps} />
            </Provider>
        );
    }
}

export default withRedux(makeStore)(MyApp);
```
</details>

And then components can simply be connected (the example considers page components):

<details>
    <summary>JavaScript</summary>

```jsx
import React from "react";
import {connect} from "react-redux";

const Page = props => (
    <div>
        <div>Prop from Redux {props.foo}</div>
        <div>Prop from getInitialProps {props.custom}</div>
    </div>
);

Page.getInitialProps = ({store, isServer, pathname, query}) => {
    store.dispatch({type: 'FOO', payload: 'foo'}); // The component can read from the store's state when rendered
    return {custom: 'custom'}; // You can pass some custom props to the component from here
}

export default connect(state => state)(Page);
```
</details>

<details>
    <summary>TypeScript</summary>

```tsx
import * as React from "react";
import {connect, ConnectedProps} from "react-redux";
import {NextPage} from "next";
import State from "wherever/your-state-type/is-located";

type Props = ConnectedProps<typeof connectToRedux>;

const Page: NextPage<Props, {custom: string}> = props => (
    <div>
        <div>Prop from Redux {props.foo}</div>
        <div>Prop from getInitialProps {props.custom}</div>
    </div>
);

Page.getInitialProps = ({store, isServer, pathname, query}) => {
    store.dispatch({type: 'FOO', payload: 'foo'}); // The component can read from the store's state when rendered
    return {custom: 'custom'}; // You can pass some custom props to the component from here
}

const connectToRedux = connect(state: State => state);

export default connectToRedux(Page);
```
</details>


## How it works

Using `next-redux-wrapper` ("the wrapper"), the following things happen on a request:

* Phase 1: `getInitialProps`
  * The wrapper creates a server-side store (using `makeStore`) with an empty initial state. In doing so it also provides the `Request` and `Response` objects as options to `makeStore`.
  * The wrapper calls the `_app`'s `getInitialProps` function and passes the previously created store.
  * Next.js takes the props returned from the `_app`'s `getInitialProps` method, along with the store's state.

* Phase 2: SSR
  * The wrapper creates a new store providing the previous store's state as `initialState` to `makeStore`. That store is passed as a property to the `_app` component.
  * Connected components may alter the store's state, but the modified state will not be transferred to the client.

* Phase 3: Client
  * The wrapper uses the state from Phase 1 to create a new store, which is again provided to the `_app` component.
  * The wrapper persists the store in the client's window object, so it can be restored in case of HMR.

**Note:** The client's state is not persisted across requests (i.e. Phase 1 always starts with an empty state).
Hence, it is reset on page reloads.
Consider using [Redux persist](#usage-with-redux-persist) if you want to persist state between requests.

## Configuration

The `withRedux` function accepts `makeStore` as its first argument. The `makeStore` function will receive the initial state and
should return a new Redux `store` instance each time it's called. No memoization is needed here, it is automatically done inside the wrapper.

`withRedux` also optionally accepts a config object as a second parameter:

- `storeKey` (optional, string) : the key used on `window` to persist the store on the client
- `debug` (optional, boolean) : enable debug logging
- `serializeState` and `deserializeState`: custom functions for serializing and deserializing the redux state, see
    [Custom serialization and deserialization](#custom-serialization-and-deserialization).

When `makeStore` is invoked it is provided with a configuration object along with a Next.js page context which includes:

- `isServer` (boolean): Indicates whether makeStore is executed on the server or the client side
- `req` (Request): The `next.js` `getInitialProps` context `req` attribute
- `res` (Response): The `next.js` `getInitialProps` context `res` attribute

The `req` and `res` attributes are only set for the first server-side store ([Phase 1](#how-it-works)).

Although it is possible to create server or client specific logic in both `makeStore` and `getInitialProps`, I highly
recommend that they do not have different behavior. This may cause errors and checksum mismatches which in turn will
ruin the whole purpose of server rendering.

## Tips and Tricks

### Document

I don't recommend using `withRedux` in `pages/_document.js`, Next.JS [does not provide](https://github.com/zeit/next.js/issues/1267)
a reliable way to determine the sequence when components will be rendered. So per Next.JS recommendation it is better
to have just data-agnostic things in `pages/_document`.

### Error Pages

Error pages can also be wrapped the same way as any other pages.

Transition to an error page (`pages/_error.js` template) will cause `pages/_app.js` to be applied but it is always a
full page transition (not HTML5 pushState), so client will have the store created from scratch using state from the server.
So unless you persist the store on the client somehow the resulting previous client state will be ignored.

### Use with layout

`MyApp` is not connected to Redux by design in order to keep the interface as minimal as possible. You can return
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
        const {Component, pageProps, store} = this.props;
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

### Async actions in `getInitialProps`

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

### Custom serialization and deserialization

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

Same thing using Immutable.JS:

```js
const {fromJS} = require('immutable');

withRedux(
    (initialState, options) => {...}, // makeStore,
    {
        serializeState: state => state.toJS(),
        deserializeState: state => fromJS(state),
    }
);
```

### Usage with Redux Saga

[Note, this method _may_ be unsafe - make sure you put a lot of thought into handling async sagas correctly. Race conditions happen very easily if you aren't careful.] To utilize Redux Saga, one simply has to make some changes to their `makeStore` function. Specifically, redux-saga needs to be initialized inside this function, rather than outside of it. (I did this at first, and got a nasty error telling me `Before running a Saga, you must mount the Saga middleware on the Store using applyMiddleware`). Here is how one accomplishes just that. This is just slightly modified from the setup example at the beginning of the docs.

```js
// Before this, import what you need and create a root saga as usual

const makeStore = (initialState, options) => {
    // 1: Create the middleware
    const sagaMiddleware = createSagaMiddleware();

    // Before we returned the created store without assigning it to a variable:
    // return createStore(reducer, initialState);

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(reducer, initialState, applyMiddleware(sagaMiddleware));

    // 3: Run your sagas:
    sagaMiddleware.run(rootSaga);

    // 4: now return the store:
    return store
};
```

### Usage with Redux Persist

Honestly, I think that putting a persistence gate is not necessary because the server can already send *some* HTML with
*some* state, so it's better to show it right away and then wait for `REHYDRATE` action to happen to show additional
delta coming from persistence storage. That's why we use Server Side Rendering in the first place.

But, for those who actually want to block the UI while rehydration is happening, here is the solution (still hacky though):

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
                    <PersistGate persistor={store.__persistor} loading={<div>Loading</div>}>
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

## Usage with Redux Hooks

In order to use Redux Hooks you need to use `useSelector` and `useDispatch` hooks instead of `connect` with `mapStateToProps` and `mapDispatchToProps`. To do so you will need to use `withRedux` as stated in [installation](#installation).

From now on, all your components will have access to the redux store (since we used `withRedux` in the `_app` component) and you'll have to remove the `connect` HOC (normal redux) in favour of `useSelector` and `useDispatch` as stated in the previous parragraph. E.g:

```jsx
const MyComponent = (props) => {
  const {mappedValueFromStore} = props
  // Regular redux hooks usage
  const storeValue = useSelector(state => state.storeValue)
  const dispatch = useDispatch()

  const triggerChange = () => {
    // Dispatch a redux action with redux hooks
    dispatch({
      type: 'CHANGE_STORE_VALUE',
      storeValue: 'new store value'
    })
  }

  return (
    <div>
      <p>From store directly: {storeValue}</p>
      <p>From mapped props: {mappedValueFromStore}</p>
      <button onClick={triggerChange}>Trigger change</button>
    </div>
  )
}

MyComponent.getInitialProps = async (ctx) => {
  const mappedValueFromStore = ctx.store.state.mappedValueFromStore // we can retrieve data from redux store in getInitialProps
  ctx.store.dispatch({
    type: 'ACCESS_FROM_GET_INITIAL_PROPS'
  }) // We can dispatch actions too

  return {
    mappedValueFromStore,
  }
}
```

We can use it both server and client side, using `ctx.store.state` and `ctx.store.dispatch` server side and with the hooks on the client side.

## Automatic Partial Static Export

The main purpose of this library is to make sure actions are consistently dispatched on all pages on client and on server from `getInitialProps` function, which makes all pages incompatible with Automatic Partial Static Export feature.

[Previous version of the lib](https://github.com/kirill-konshin/next-redux-wrapper/tree/1.x) was working on page level, so theoretically you can wrap only *some* pages. But on the other hand you would then need to make sure that no redux-connected components will appear on pages that were not wrapped. So rule of thumb always was to wrap all pages. Which is exactly what the new version does.

Which brings us to the conclusion:

If you need a static website you don't need this lib at all because you can always dispatch at client side on `componentDidMount` just like you normally would with bare React Redux, and let the server only serve initial/static markup.

## Upgrade from 1.x

If your project was using NextJS 5 and Next Redux Wrapper 1.x these instructions will help you to upgrade to latest
version.

1. Upgrade NextJS and Wrapper
    ```bash
    $ npm install next@6 --save-dev
    $ npm install next-redux-wrapper@latest --save
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

That's it. Your project should now work the same as before.

## Resources

* [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
* [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
* Redux Saga Example: https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e.
