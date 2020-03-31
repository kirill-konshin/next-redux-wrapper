# Redux Wrapper for Next.js  <!-- omit in toc -->

[![npm version](https://badge.fury.io/js/next-redux-wrapper.svg)](https://www.npmjs.com/package/next-redux-wrapper)
![Build status](https://travis-ci.org/kirill-konshin/next-redux-wrapper.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/kirill-konshin/next-redux-wrapper/badge.svg?branch=master)](https://coveralls.io/github/kirill-konshin/next-redux-wrapper?branch=master)


A HOC that brings Next.js and Redux together

:warning: The current version of this library only works with Next.js 9.3 and newer. If you are required to use Next.js 6-9 you can use version 3-5 of this library. Otherwise, consider upgrading Next.js. :warning:

Next.js 5 (for individual pages) is only compatible with the [1.x branch](https://github.com/kirill-konshin/next-redux-wrapper/tree/1.x). You can upgrade it following these simple [instructions](#upgrade-from-1x).

Contents:

- [Motivation](#motivation)
- [Installation](#installation)
- [Usage](#usage)
  - [getStaticProps](#getstaticprops)
  - [getServerSideProps](#getserversideprops)
  - [getInitialProps](#getinitialprops)
  - [App](#app)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Tips and Tricks](#tips-and-tricks)
  - [Document](#document)
  - [Error Pages](#error-pages)
  - [Async actions](#async-actions)
  - [Custom serialization and deserialization](#custom-serialization-and-deserialization)
  - [Usage with Redux Saga](#usage-with-redux-saga)
  - [Usage with Redux Persist](#usage-with-redux-persist)
- [Upgrade from 5.x to 6.x](#upgrade-from-5x-to-6x)
- [Upgrade from 1.x to 2.x](#upgrade-from-1x-to-2x)
- [Resources](#resources)

# Motivation

Setting up Redux for static apps is rather simple: a single Redux store has to be created that is provided to all pages.

When Next.js static site generator or server side rendering is involved, however, things start to get complicated as another store instance is needed on the server to render Redux-connected components.

Furthermore, access to the Redux store may also be needed during a page's `getInitialProps`.

This is where `next-redux-wrapper` comes in handy: It automatically creates the store instances for you and makes sure they all have the same state.

# Installation

```bash
npm install next-redux-wrapper --save
```

# Usage

All examples are written in TypeScript. If you're using plain JavaScript just omit type declarations.

Next.js has several data fetching mechanisms, this library can attach to any of them. But first you have to write some common code.

**Please note that your reducer *must* have the `HYDRATE` action handler.** This behavior was added in version 6 of this library. We'll talk about this special action later.

Create a file named `store.ts`:

```typescript
// store.ts

import {createStore, AnyAction} from 'redux';
import {MakeStore, createWrapper, Context, HYDRATE} from 'next-redux-wrapper';

export interface State {
    tick: string;
}

// create your reducer
const reducer = (state: State = {tick: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case HYDRATE:
            return {...state, ...action.payload};
        case 'TICK':
            return {...state, tick: action.payload};
        default:
            return state;
    }
};

// create a makeStore function
const makeStore: MakeStore<State> = (context: Context) => {
    const store = createStore(reducer);
    return store;
};

// export an assembled wrapper
export const wrapper = createWrapper<State>(makeStore, {debug: true});
```

## Configuration

The `createWrapper` function accepts `makeStore` as its first argument. The `makeStore` function should return a new Redux `Store` instance each time it's called. No memoization is needed here, it is automatically done inside the wrapper.

`createWrapper` also optionally accepts a config object as a second parameter:

- `storeKey` (optional, string) : the key used on `window` to persist the store on the client
- `debug` (optional, boolean) : enable debug logging
- `serializeState` and `deserializeState`: custom functions for serializing and deserializing the redux state, see
    [Custom serialization and deserialization](#custom-serialization-and-deserialization).

When `makeStore` is invoked it is provided with a Next.js context, which could be [`NextPageContext`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps) or [`AppContext`](https://nextjs.org/docs/advanced-features/custom-app) or [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) context depending on which lifecycle function you will wrap.

Some of those contexts (`getServerSideProps` always, and `NextPageContext`, `AppContext` sometimes if page is rendered on server) can have request and response related properties:

- `req` (`IncomingMessage`)
- `res` (`ServerResponse`)

Although it is possible to create server or client specific logic in both `makeStore`, I highly recommend that they do not have different behavior. This may cause errors and checksum mismatches which in turn will ruin the whole purpose of server rendering.

## getStaticProps

This section describes how to attach to [getStaticProps](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) lifecycle function.

Let's create a page in `pages/pageName.tsx`:

```typescript
import React from 'react';
import {NextPage} from 'next';
import {Provider, useSelector} from 'react-redux';
import {wrapper, State} from '../store';

export const getStaticProps = wrapper.getStaticProps(
    ({store, preview}) => {
        console.log('2. Page.getStaticProps uses the store to dispatch things');
        store.dispatch({type: 'TICK', payload: 'was set in other page ' + preview});
    }
);

// you can also use `connect()` instead of hooks
const Page: NextPage = () => {
    const {tick} = useSelector<State, State>(state => state);
    return (
        <div>{tick}</div>
    );
};

export default wrapper.withRedux(Page);
```

:warning: **Each time when pages that have `getStaticProps` are opened by user the `HYDRATE` action will be dispatched.** The `payload` of this action will contain the `state` at the moment of static generation, it will not have client state, so your reducer must merge it with existing client state properly. More about this in [Server and Client State Separation](#server-and-client-state-separation).

## getServerSideProps

This section describes how to attach to [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) lifecycle function.

Let's create a page in `pages/pageName.tsx`:

```typescript
import React from 'react';
import {NextPage} from 'next';
import {Provider, connect} from 'react-redux';
import {wrapper, State} from '../store';

export const getServerSideProps = wrapper.getServerSideProps(
    ({store, req, res, ...etc}) => {
        console.log('2. Page.getServerSideProps uses the store to dispatch things');
        store.dispatch({type: 'TICK', payload: 'was set in other page'});
    }
);

// Page itself is not connected to Redux Store, it has to render Provider to allow child components to connect to Redux Store
const Page: NextPage<State> = ({tick}) => (
    <div>{tick}</div>
);

// you can also use Redux `useSelector` and other hooks instead of `connect()`
export default wrapper.withRedux(connect(state: State) => state)(Page));
```

:warning: **Each time when pages that have `getServerSideProps` are opened by user the `HYDRATE` action will be dispatched.** The `payload` of this action will contain the `state` at the moment of server side rendering, it will not have client state, so your reducer must merge it with existing client state properly. More about this in [Server and Client State Separation](#server-and-client-state-separation).

## `getInitialProps`

```typescript
import React, {Component} from 'react';
import {NextPage} from 'next';
import {wrapper, State} from '../store';

// you can also use `connect()` instead of hooks
const Page: NextPage = () => {
    const {tick} = useSelector<State, State>(state => state);
    return (
        <div>{tick}</div>
    );
};

Page.getInitialProps = wrapper.getInitialPageProps(
   ({store, pathname, req, res}) => {
       console.log('2. Page.getInitialProps uses the store to dispatch things');
       store.dispatch({type: 'TICK', payload: 'was set in error page ' + pathname});
   }
);

export default wrapper.withRedux(Page);
```

Keep in mind that `req` and `res` may not be available if `getInitialProps` is called on client side.

Stateless function component also can be replaced with class:

```typescript
class Page extends Component {

    public static getInitialProps = wrapper.getInitialPageProps(...)

    render() {
        // stuff
    }
}
```

## App

:warning: This mode is not compatible with [Next.js 9's Auto Partial Static Export](https://nextjs.org/blog/next-9#automatic-partial-static-export) feature, see the [explanation below](#automatic-partial-static-export).

The wrapper can also be attached to your `_app` component (located in `/pages`). All other components can use the `connect` function of `react-redux`.

```typescript
# pages/_app.tsx

import React from 'react';
import App, {AppInitialProps} from 'next/app';
import {wrapper, State} from '../components/store';
import {State} from '../components/reducer';

class MyApp extends App<AppInitialProps> {

    public static getInitialProps = wrapper.getInitialAppProps<Promise<AppInitialProps>>(
        async ({Component, ctx}) => {

            ctx.store.dispatch({type: 'TOE', payload: 'was set in _app'});

            return {
                pageProps: {
                    // Call page-level getInitialProps
                    ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
                    // Some custom thing for all pages
                    pathname: ctx.pathname,
                },
            };
        },
    );

    public render() {
        const {Component, pageProps} = this.props;

        return (
            <Component {...pageProps} />
        );
    }
},

export default wrapper.withRedux(MyApp);
```

And then all pages can simply be connected (the example considers page components):

```jsx
// pages/xxx.tsx

import React from "react";
import {NextPage} from 'next';
import {connect} from "react-redux";
import {NextPageContext} from "next";
import {State} from "../store";

const Page:NextPage<State> = ({foo, custom}) => (
    <div>
        <div>Prop from Redux {foo}</div>
        <div>Prop from getInitialProps {custom}</div>
    </div>
);

// No need to wrap pages if App was wrapped
Page.getInitialProps = ({store, isServer, pathname, query}: NextPageContext) => {
    store.dispatch({type: 'FOO', payload: 'foo'}); // The component can read from the store's state when rendered
    return {custom: 'custom'}; // You can pass some custom props to the component from here
}

export default connect((state: State) => state)(Page);
```

## How it works

Using `next-redux-wrapper` ("the wrapper"), the following things happen on a request:

* Phase 1: `getInitialProps`/`getStaticProps`/`getServerSideProps`
  * The wrapper creates a server-side store (using `makeStore`) with an empty initial state. In doing so it also provides the `Request` and `Response` objects as options to `makeStore`.
  * In App mode:
    * The wrapper calls the `_app`'s `getInitialProps` function and passes the previously created store.
    * Next.js takes the props returned from the `_app`'s `getInitialProps` method, along with the store's state.
  * In per-page mode:
    * The wrapper calls the Page's `getXXXProps` function and passes the previously created store.
    * Next.js takes the props returned from the Page's `getXXXProps` method, along with the store's state.

* Phase 2: SSR
  * The wrapper creates a new store using `makeStore`
  * The wrapper dispatches `HYDRATE` action with the previous store's state as `payload`
  * That store is passed as a property to the `_app` or `page` component.
  * **Connected components may alter the store's state, but the modified state will not be transferred to the client.**

* Phase 3: Client
  * The wrapper creates a new store
  * The wrapper dispatches `HYDRATE` action with the state from Phase 1 as `payload`
  * That store is passed as a property to the `_app` or `page` component.
  * The wrapper persists the store in the client's window object, so it can be restored in case of HMR.

**Note:** The client's state is not persisted across requests (i.e. Phase 1 always starts with an empty state).
Hence, it is reset on page reloads.
Consider using [Redux persist](#usage-with-redux-persist) if you want to persist state between requests.

## Tips and Tricks

### Server and Client state separation

Each time when pages that have `getStaticProps` or `getServerSideProps` are opened by user the `HYDRATE` action will be dispatched. The `payload` of this action will contain the `state` at the moment of static generation or server side rendering, so your reducer must merge it with existing client state properly.

The easiest and most stable way to make sure nothing is accidentally overwritten is to make sure that your reducer applies client side and server side actions to different substates of your state and they never clash:

```typescript
export interface State {
    server: any;
    client: any;
}

const reducer = (state: State = {tick: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case HYDRATE:
            return {
                ...state,
                server: {
                    ...state.server,
                    ...action.payload.server
                }
            }
        case 'CLIENT_SERVER':
            return {
                ...state,
                server: {
                    ...state.server,
                    tick: action.payload
                }
            };
        case 'CLIENT_ACTION':
            return {
                ...state,
                client: {
                    ...state.client,
                    tick: action.payload
                }
            };
        default:
            return state;
    }
};
```

Also you can use a library like https://github.com/benjamine/jsondiffpatch to analyze diff and apply it properly.

### Document

I don't recommend using `withRedux` in `pages/_document.js`, Next.JS [does not provide](https://github.com/zeit/next.js/issues/1267)
a reliable way to determine the sequence when components will be rendered. So per Next.JS recommendation it is better
to have just data-agnostic things in `pages/_document`.

### Error Pages

Error pages can also be wrapped the same way as any other pages.

Transition to an error page (`pages/_error.js` template) will cause `pages/_app.js` to be applied but it is always a
full page transition (not HTML5 pushState), so client will have the store created from scratch using state from the server.
So unless you persist the store on the client somehow the resulting previous client state will be ignored.

### Async actions

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

createWrapper({
    serializeState: state => serialize(state),
    deserializeState: state => deserialize(state)
});
```

Same thing using Immutable.JS:

```js
const {fromJS} = require('immutable');

createWrapper({
    serializeState: state => state.toJS(),
    deserializeState: state => fromJS(state),
});
```

### Usage with Redux Saga

[Note, this method _may_ be unsafe - make sure you put a lot of thought into handling async sagas correctly. Race conditions happen very easily if you aren't careful.] To utilize Redux Saga, one simply has to make some changes to their `makeStore` function. Specifically, redux-saga needs to be initialized inside this function, rather than outside of it. (I did this at first, and got a nasty error telling me `Before running a Saga, you must mount the Saga middleware on the Store using applyMiddleware`). Here is how one accomplishes just that. This is just slightly modified from the setup example at the beginning of the docs.

```js
// Before this, import what you need and create a root saga as usual

const makeStore = (context) => {
    // 1: Create the middleware
    const sagaMiddleware = createSagaMiddleware();

    // Before we returned the created store without assigning it to a variable:
    // return createStore(reducer);

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(reducer, undefined, applyMiddleware(sagaMiddleware));

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

const makeConfiguredStore = (reducer) =>
    createStore(reducer, undefined, applyMiddleware(logger));

const makeStore = (initialState, {isServer, req, debug, storeKey}) => {

    if (isServer) {

        initialState = initialState || {fromServer: 'foo'};

        return makeConfiguredStore(reducer);

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
        const store = makeConfiguredStore(persistedReducer);

        store.__persistor = persistStore(store); // Nasty hack

        return store;
    }
};

export const wrapper = createWrapper(makeStore);

export const setClientState = (clientState) => ({
    type: SET_CLIENT_STATE,
    payload: clientState
});
```

And then in Next.js `_app` page:

```js
// pages/_app.js
import React from "react";
import App from "next/app";
import withRedux from "next-redux-wrapper";
import {wrapper} from "./lib/redux";
import {PersistGate} from 'redux-persist/integration/react';

export default wrapper.withRedux(class MyApp extends App {

    render() {
        const {Component, pageProps} = this.props;
        return (
            <PersistGate persistor={store.__persistor} loading={<div>Loading</div>}>
                <Component {...pageProps} />
            </PersistGate>
        );
    }

});
```

And then in Next.js page:

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

## Upgrade from 5.x to 6.x

Major change in the way how things are wrapped in version 6.

1. `withRedux` no longer takes `makeStore` and config as parameters, you need to create a wrapper `const wrapper = createWrapper(makeStore, {debug: true})` and then use `wrapper.withRedux(Page)`

2. `makeStore` no longer gets `initialState`, the signature is `makeStore(context: Context)`, where context could be [`NextPageContext`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps) or [`AppContext`](https://nextjs.org/docs/advanced-features/custom-app) or [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) context depending on which lifecycle function you will wrap

3. Each time when pages that have `getStaticProps` or `getServerSideProps` are opened by user the `HYDRATE` action will be dispatched. The `payload` of this action will contain the `state` at the moment of static generation or server side rendering, so your reducer must merge it with existing client state properly

5. App that used `getInitialProps` need to have App `getInitialProps` wrapped with `wrapper.getInitialProps`, Page's `getInitialProps` can remain unwrapped then

6. If you haven't used App then Pages' `getInitialProps` do need to be wrapped with `wrapper.getInitialProps`

7. `App` should no longer wrap it's childern with `Provider`

## Upgrade from 1.x to 2.x

If your project was using Next.js 5 and Next Redux Wrapper 1.x these instructions will help you to upgrade to 2.x.

1. Upgrade Next.js and Wrapper
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
    import App from "next/app";
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
            const {Component, pageProps} = this.props;
            return (
                <Component {...pageProps} />
            );
        }

    });
    ```

4. Follow [Next.js 6 upgrade instructions](https://github.com/zeit/next.js/issues/4239) for all your components
    (`props.router` instead of `props.url` and so on)

That's it. Your project should now work the same as before.

## Resources

* [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
* [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
* Redux Saga Example: https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e.
