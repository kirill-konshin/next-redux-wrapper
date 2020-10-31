# Redux Wrapper for Next.js  <!-- omit in toc -->

[![npm version](https://badge.fury.io/js/next-redux-wrapper.svg)](https://www.npmjs.com/package/next-redux-wrapper)
![Build status](https://travis-ci.org/kirill-konshin/next-redux-wrapper.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/kirill-konshin/next-redux-wrapper/badge.svg?branch=master)](https://coveralls.io/github/kirill-konshin/next-redux-wrapper?branch=master)

A HOC that brings Next.js and Redux together

:warning: The current version of this library only works with Next.js 9.3 and newer. If you are required to use Next.js 6-9 you can use version 3-5 of this library, see [branches](https://github.com/kirill-konshin/next-redux-wrapper/branches). Otherwise, consider upgrading Next.js. :warning:

Contents:

- [Motivation](#motivation)
- [Installation](#installation)
- [Usage](#usage)
  - [State reconciliation during hydration](#state-reconciliation-during-hydration)
  - [Configuration](#configuration)
  - [getStaticProps](#getstaticprops)
  - [getServerSideProps](#getserversideprops)
  - [Page.getInitialProps](#pagegetinitialprops)
  - [App](#app)
  - [App and getServerSideProps or getStaticProps at page level](#app-and-getserversideprops-or-getstaticprops-at-page-level)
- [How it works](#how-it-works)
- [Tips and Tricks](#tips-and-tricks)
  - [Server and Client state separation](#server-and-client-state-separation)
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

Furthermore, access to the Redux `Store` may also be needed during a page's `getInitialProps`.

This is where `next-redux-wrapper` comes in handy: It automatically creates the store instances for you and makes sure they all have the same state.

Moreover it allows to properly handle complex cases like `App.getInitialProps` (when using `pages/_app`) together with `getStaticProps` or `getServerSideProps` at individual page level.

Library provides uniform interface no matter in which Next.js lifecycle method you would like to use the `Store`.

# Installation

```bash
npm install next-redux-wrapper react-redux --save
```

Note that `next-redux-wrapper` requires `react-redux` as peer dependency.

# Usage

Live example: https://codesandbox.io/s/next-redux-wrapper-demo-7n2t5.

All examples are written in TypeScript. If you're using plain JavaScript just omit type declarations.

Next.js has several data fetching mechanisms, this library can attach to any of them. But first you have to write some common code.

**Please note that your reducer *must* have the `HYDRATE` action handler. `HYDRATE` action handler must properly reconciliate the hydrated state on top of the existing state (if any).** This behavior was added in version 6 of this library. We'll talk about this special action later.

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
            // Attention! This will overwrite client state! Real apps should use proper reconciliation.
            return {...state, ...action.payload};
        case 'TICK':
            return {...state, tick: action.payload};
        default:
            return state;
    }
};

// create a makeStore function
const makeStore: MakeStore<State> = (context: Context) => createStore(reducer);

// export an assembled wrapper
export const wrapper = createWrapper<State>(makeStore, {debug: true});
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
// store.ts

import {createStore} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

// create your reducer
const reducer = (state = {tick: 'init'}, action) => {
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
const makeStore = context => createStore(reducer);

// export an assembled wrapper
export const wrapper = createWrapper(makeStore, {debug: true});
```
</details>

It is highly recommended to use `pages/_app` to wrap all pages at once, otherwise due to potential race conditions you may get `Cannot update component while rendering another component`:

```typescript
import React, {FC} from 'react';
import {AppProps} from 'next/app';
import {wrapper} from '../components/store';

const WrappedApp: FC<AppProps> = ({Component, pageProps}) => (
    <Component {...pageProps} />
);

export default wrapper.withRedux(WrappedApp);
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
import React from 'react';
import {wrapper} from '../components/store';

const MyApp = ({Component, pageProps}) => (
    <Component {...pageProps} />
);

export default wrapper.withRedux(MyApp);
```
</details>

:warning: Next.js provides [generic `getInitialProps`](https://github.com/vercel/next.js/blob/canary/packages/next/pages/_app.tsx#L21) when using `class MyApp extends App` which will be picked up by wrapper, so you **must not extend `App`** as you'll be opted out of Automatic Static Optimization: https://err.sh/next.js/opt-out-auto-static-optimization. Just export a regular Functional Component as in the example above.

## State reconciliation during hydration

Each time when pages that have `getStaticProps` or `getServerSideProps` are opened by user the `HYDRATE` action will be dispatched. This may happen during initial page load and during regular page navigation. The `payload` of this action will contain the `state` at the moment of static generation or server side rendering, so your reducer must merge it with existing client state properly.

Simplest way is to use [server and client state separation](#server-and-client-state-separation).

Another way is to use https://github.com/benjamine/jsondiffpatch to analyze diff and apply it properly:

```js
import {HYDRATE} from 'next-redux-wrapper';

// create your reducer
const reducer = (state = {tick: 'init'}, action) => {
    switch (action.type) {
        case HYDRATE:
            const stateDiff = diff(state, action.payload) as any;
            const wasBumpedOnClient = stateDiff?.page?.[0]?.endsWith('X'); // or any other criteria
            return {
                ...state,
                ...action.payload,
                page: wasBumpedOnClient ? state.page : action.payload.page, // keep existing state or use hydrated
            };
        case 'TICK':
            return {...state, tick: action.payload};
        default:
            return state;
    }
};
```

Or [like this](https://github.com/zeit/next.js/blob/canary/examples/with-redux-wrapper/store/store.js) (from [with-redux-wrapper example](https://github.com/zeit/next.js/tree/canary/examples/with-redux-wrapper) in Next.js repo):

```js
const reducer = (state, action) => {
  if (action.type === HYDRATE) {
    const nextState = {
      ...state, // use previous state
      ...action.payload, // apply delta from hydration
    }
    if (state.count) nextState.count = state.count // preserve count value on client side navigation
    return nextState
  } else {
    return combinedReducer(state, action)
  }
}
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
import {useSelector} from 'react-redux';
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

export default Page;
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
import React from 'react';
import {useSelector} from 'react-redux';
import {wrapper} from '../store';

export const getStaticProps = wrapper.getStaticProps(
    ({store, preview}) => {
        console.log('2. Page.getStaticProps uses the store to dispatch things');
        store.dispatch({type: 'TICK', payload: 'was set in other page ' + preview});
    }
);

// you can also use `connect()` instead of hooks
const Page = () => {
    const {tick} = useSelector(state => state);
    return (
        <div>{tick}</div>
    );
};

export default Page;
```
</details>

:warning: **Each time when pages that have `getStaticProps` are opened by user the `HYDRATE` action will be dispatched.** The `payload` of this action will contain the `state` at the moment of static generation, it will not have client state, so your reducer must merge it with existing client state properly. More about this in [Server and Client State Separation](#server-and-client-state-separation).

Although you can wrap individual pages (and not wrap the `pages/_app`) it is not recommended, see last paragraph in [usage section](#usage).

## getServerSideProps

This section describes how to attach to [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) lifecycle function.

Let's create a page in `pages/pageName.tsx`:

```typescript
import React from 'react';
import {NextPage} from 'next';
import {connect} from 'react-redux';
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
export default connect((state: State) => state)(Page);
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
import React from 'react';
import {connect} from 'react-redux';
import {wrapper} from '../store';

export const getServerSideProps = wrapper.getServerSideProps(
    ({store, req, res, ...etc}) => {
        console.log('2. Page.getServerSideProps uses the store to dispatch things');
        store.dispatch({type: 'TICK', payload: 'was set in other page'});
    }
);

// Page itself is not connected to Redux Store, it has to render Provider to allow child components to connect to Redux Store
const Page = ({tick}) => (
    <div>{tick}</div>
);

// you can also use Redux `useSelector` and other hooks instead of `connect()`
export default connect(state => state)(Page);
```
</details>

:warning: **Each time when pages that have `getServerSideProps` are opened by user the `HYDRATE` action will be dispatched.** The `payload` of this action will contain the `state` at the moment of server side rendering, it will not have client state, so your reducer must merge it with existing client state properly. More about this in [Server and Client State Separation](#server-and-client-state-separation).

Although you can wrap individual pages (and not wrap the `pages/_app`) it is not recommended, see last paragraph in [usage section](#usage).

## `Page.getInitialProps`

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

Page.getInitialProps = ({store, pathname, req, res}) => {
    console.log('2. Page.getInitialProps uses the store to dispatch things');
    store.dispatch({type: 'TICK', payload: 'was set in error page ' + pathname});
};

export default Page;
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
import React, {Component} from 'react';
import {wrapper} from '../store';

// you can also use `connect()` instead of hooks
const Page = () => {
    const {tick} = useSelector(state => state);
    return (
        <div>{tick}</div>
    );
};

Page.getInitialProps = ({store, pathname, req, res}) => {
    console.log('2. Page.getInitialProps uses the store to dispatch things');
    store.dispatch({type: 'TICK', payload: 'was set in error page ' + pathname});
};

export default Page;
```
</details>

Keep in mind that `req` and `res` may not be available if `getInitialProps` is called on client side.

Stateless function component also can be replaced with class:

```js
class Page extends Component {

    public static getInitialProps = () => { ... };

    render() {
        // stuff
    }
}

export default Page;
```

Although you can wrap individual pages (and not wrap the `pages/_app`) it is not recommended, see last paragraph in [usage section](#usage).

## App

:warning: You can dispatch actions from the `pages/_app` too. But this mode is not compatible with [Next.js 9's Auto Partial Static Export](https://nextjs.org/blog/next-9#automatic-partial-static-export) feature, see the [explanation below](#automatic-partial-static-export).

The wrapper can also be attached to your `_app` component (located in `/pages`). All other components can use the `connect` function of `react-redux`.

```typescript
# pages/_app.tsx

import React from 'react';
import App, {AppInitialProps, AppContext} from 'next/app';
import {wrapper} from '../components/store';
import {State} from '../components/reducer';

class MyApp extends App<AppInitialProps> {

    public static getInitialProps = async ({Component, ctx}: AppContext) => {

        ctx.store.dispatch({type: 'TOE', payload: 'was set in _app'});

        return {
            pageProps: {
                // Call page-level getInitialProps
                ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
                // Some custom thing for all pages
                pathname: ctx.pathname,
            },
        };

    };

    public render() {
        const {Component, pageProps} = this.props;

        return (
            <Component {...pageProps} />
        );
    }
}

export default wrapper.withRedux(MyApp);
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
# pages/_app.tsx

import React from 'react';
import App from 'next/app';
import {wrapper} from '../components/store';

class MyApp extends App {
    static getInitialProps = async ({Component, ctx}) => {

        ctx.store.dispatch({type: 'TOE', payload: 'was set in _app'});

        return {
            pageProps: {
                // Call page-level getInitialProps
                ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
                // Some custom thing for all pages
                pathname: ctx.pathname,
            },
        };

    };

    render() {
        const {Component, pageProps} = this.props;

        return (
            <Component {...pageProps} />
        );
    }
}

export default wrapper.withRedux(MyApp);
```
</details>

And then all pages can simply be connected (the example considers page components):

```typescript
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
Page.getInitialProps = ({store, pathname, query}: NextPageContext) => {
    store.dispatch({type: 'FOO', payload: 'foo'}); // The component can read from the store's state when rendered
    return {custom: 'custom'}; // You can pass some custom props to the component from here
}

export default connect((state: State) => state)(Page);
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
// pages/xxx.tsx

import React from "react";
import {connect} from "react-redux";

const Page = ({foo, custom}) => (
    <div>
        <div>Prop from Redux {foo}</div>
        <div>Prop from getInitialProps {custom}</div>
    </div>
);

// No need to wrap pages if App was wrapped
Page.getInitialProps = ({store, pathname, query}) => {
    store.dispatch({type: 'FOO', payload: 'foo'}); // The component can read from the store's state when rendered
    return {custom: 'custom'}; // You can pass some custom props to the component from here
}

export default connect((state: State) => state)(Page);
```
</details>

## App and `getServerSideProps` or `getStaticProps` at page level

You can also use `getServerSideProps` or `getStaticProps` at page level, in this case `HYDRATE` action will be dispatched twice: with state after `App.getInitialProps` and then with state after `getServerSideProps` or `getStaticProps`:

- If you use `getServerSideProps` at page level then `store` in `getServerSideProps` will be executed after `App.getInitialProps` and will have state from it, so second `HYDRATE` will have full state from both
- :warning: If you use `getStaticProps` at page level then `store` in `getStaticProps` will be executed at compile time and will **NOT** have state from `App.getInitialProps` because they are executed in different contexts and state cannot be shared. First `HYDRATE` actions state after `App.getInitialProps` and second will have state after `getStaticProps` (even though it was executed earlier in time).

Simplest way to ensure proper merging is to drop initial values from `action.payload`:

```typescript
const reducer = (state: State = {app: 'init', page: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case HYDRATE:
            if (action.payload.app === 'init') delete action.payload.app;
            if (action.payload.page === 'init') delete action.payload.page;
            return {...state, ...action.payload};
        case 'APP':
            return {...state, app: action.payload};
        case 'PAGE':
            return {...state, page: action.payload};
        default:
            return state;
    }
};
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
const reducer = (state = {app: 'init', page: 'init'}, action) => {
    switch (action.type) {
        case HYDRATE:
            if (action.payload.app === 'init') delete action.payload.app;
            if (action.payload.page === 'init') delete action.payload.page;
            return {...state, ...action.payload};
        case 'APP':
            return {...state, app: action.payload};
        case 'PAGE':
            return {...state, page: action.payload};
        default:
            return state;
    }
};
```
</details>

Assume page only dispatches `PAGE` actiona and App only `APP`, this makes state merging safe.

More about that in [Server and Client state separation](#server-and-client-state-separation).

# How it works

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
        case 'SERVER_ACTION':
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

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
const reducer = (state = {tick: 'init'}, action) => {
    switch (action.type) {
        case HYDRATE:
            return {
                ...state,
                server: {
                    ...state.server,
                    ...action.payload.server
                }
            }
        case 'SERVER_ACTION':
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
</details>

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

You need to install https://github.com/pburtchaell/redux-promise-middleware in order to dispatch Promises as async actions. Follow the installation guide of the library, then you'll be able to handle it like this:

```js
function someAsyncAction() {
    return {
        type: 'FOO',
        payload: new Promise(resolve => resolve('foo'))
    }
}

async function getInitialProps({store}) {
    await store.dispatch(someAsyncAction());
    return {custom: 'custom'};
}
```

### Custom serialization and deserialization

If you are storing complex types such as Immutable.JS or EJSON objects in your state, a custom serialize and deserialize
handler might be handy to serialize the redux state on the server and derserialize it again on the client. To do so,
provide `serializeState` and `deserializeState` as config options to `withRedux`.

The reason is that state snapshot is transferred over the network from server to client as a plain object.

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

[Note, this method _may_ be unsafe - make sure you put a lot of thought into handling async sagas correctly. Race conditions happen very easily if you aren't careful.] To utilize Redux Saga, one simply has to make some changes to their `makeStore` function. Specifically, `redux-saga` needs to be initialized inside this function, rather than outside of it. (I did this at first, and got a nasty error telling me `Before running a Saga, you must mount the Saga middleware on the Store using applyMiddleware`). Here is how one accomplishes just that. This is just slightly modified from the setup example at the beginning of the docs. Keep in mind that this setup will opt you out of Automatic Static Optimization: https://err.sh/next.js/opt-out-auto-static-optimization.

Create your root saga as usual, then implement the store creator:

```typescript
import {createStore, applyMiddleware, Store} from 'redux';
import {MakeStore, createWrapper, Context} from 'next-redux-wrapper';
import createSagaMiddleware, {Task} from 'redux-saga';
import reducer, {State} from './reducer';
import rootSaga from './saga';

export interface SagaStore extends Store {
    sagaTask?: Task;
}

export const makeStore: MakeStore<State> = (context: Context) => {
    // 1: Create the middleware
    const sagaMiddleware = createSagaMiddleware();

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(reducer, applyMiddleware(sagaMiddleware));

    // 3: Run your sagas on server
    (store as SagaStore).sagaTask = sagaMiddleware.run(rootSaga);

    // 4: now return the store:
    return store;
};

export const wrapper = createWrapper<State>(makeStore, {debug: true});
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
import {createStore, applyMiddleware} from 'redux';
import {createWrapper} from 'next-redux-wrapper';
import createSagaMiddleware from 'redux-saga';
import reducer from './reducer';
import rootSaga from './saga';

export const makeStore = (context) => {
    // 1: Create the middleware
    const sagaMiddleware = createSagaMiddleware();

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(reducer, applyMiddleware(sagaMiddleware));

    // 3: Run your sagas on server
    (store as SagaStore).sagaTask = sagaMiddleware.run(rootSaga);

    // 4: now return the store:
    return store;
};

export const wrapper = createWrapper(makeStore, {debug: true});
```
</details>

#### Using `pages/_app`

Then in the `pages/_app` wait stop saga and wait for it to finish when execution is on server:

```typescript
import React from 'react';
import App, {AppInitialProps, AppContext} from 'next/app';
import {END} from 'redux-saga';
import {SagaStore, wrapper} from '../components/store';

class WrappedApp extends App<AppInitialProps> {
    public static getInitialProps = async ({Component, ctx}: AppContext) => {
        // 1. Wait for all page actions to dispatch
        const pageProps = {
            ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
        };

        // 2. Stop the saga if on server
        if (ctx.req) {
            ctx.store.dispatch(END);
            await (ctx.store as SagaStore).sagaTask.toPromise();
        }

        // 3. Return props
        return {
            pageProps,
        };
    };

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
import React from 'react';
import App from 'next/app';
import {END} from 'redux-saga';
import {SagaStore, wrapper} from '../components/store';

class WrappedApp extends App {
    public static getInitialProps = async ({Component, ctx}) => {
        // 1. Wait for all page actions to dispatch
        const pageProps = {
            ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
        };

        // 2. Stop the saga if on server
        if (ctx.req) {
            ctx.store.dispatch(END);
            await (ctx.store as SagaStore).sagaTask.toPromise();
        }

        // 3. Return props
        return {
            pageProps,
        };
    };

    public render() {
        const {Component, pageProps} = this.props;
        return <Component {...pageProps} />;
    }
}

export default wrapper.withRedux(WrappedApp);
```
</details>

#### Using `getServerSideProps` or `getStaticProps`

In order to use it with `getServerSideProps` or `getStaticProps` you need to `await` for sagas in each page's handler:

```js
export const getServerSideProps = ReduxWrapper.getServerSideProps(
  async ({ store, req, res, ...etc }) => {
    // regular stuff
    store.dispatch(ApplicationSlice.actions.updateConfiguration());
    // end the saga
    store.dispatch(END);
    await store.sagaTask.toPromise();
  }
);
```

#### Usage without `getInitialProps` inside `_app`

If you don't want to opt-out of automatic pre-rendering in your Next.js app, you can manage server-called sagas on a per page basis like [the official Next.js "with Redux Saga" example](https://github.com/vercel/next.js/tree/canary/examples/with-redux-saga) does. If you do go with this option, please ensure that you await any and all sagas within any [Next.js page methods](https://nextjs.org/docs/basic-features/data-fetching). If you miss it on one of pages you'll end up with inconsistent state being sent to client. So, we consider waiting in `_app` to be automatically safer, but obviously the main drawback is opting out of automatic static exports.

### Usage with Redux Persist

Boilerplate: https://github.com/fazlulkarimweb/with-next-redux-wrapper-redux-persist

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
    // Usual stuff with HYDRATE handler
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

const makeStore = () => {

    const isServer = typeof window === 'undefined';

    if (isServer) {

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

And then in Next.js `_app` page you can use bare context access to get the store (https://react-redux.js.org/api/provider#props):

```js
// pages/_app.tsx
import React from "react";
import App from "next/app";
import {ReactReduxContext} from 'react-redux'
import {wrapper} from "./lib/redux";
import {PersistGate} from 'redux-persist/integration/react';

export default wrapper.withRedux(class MyApp extends App {
    render() {
        const {Component, pageProps} = this.props;
        return (
            <ReactReduxContext.Consumer>
                {({ store }) => {
                    <PersistGate persistor={store.__persistor} loading={<div>Loading</div>}>
                        <Component {...pageProps} />
                    </PersistGate>
                }}
            </ReactReduxContext.Consumer>
        );
    }
});
```

Or using hooks:

```js
// pages/_app.tsx
import React from "react";
import App from "next/app";
import {useStore} from 'react-redux'
import {wrapper} from "./lib/redux";
import {PersistGate} from 'redux-persist/integration/react';

export default wrapper.withRedux(({Component, pageProps}) => {
    const store = useStore();
    return (
        <PersistGate persistor={store.__persistor} loading={<div>Loading</div>}>
            <Component {...pageProps} />
        </PersistGate>
    );
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

1. Default export `withRedux` is marked deprecated, you should create a wrapper `const wrapper = createWrapper(makeStore, {debug: true})` and then use `wrapper.withRedux(MyApp)`.

2. Your `makeStore` function no longer gets `initialState`, it only receives the context: `makeStore(context: Context)`. Context could be [`NextPageContext`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps) or [`AppContext`](https://nextjs.org/docs/advanced-features/custom-app) or [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) context depending on which lifecycle function you will wrap. Instead, you need to handle the `HYDRATE` action in the reducer. The `payload` of this action will contain the `state` at the moment of static generation or server side rendering, so your reducer must merge it with existing client state properly.

3. `App` should no longer wrap its children with `Provider`, it is now done internally.

4. `isServer` is not passed in `context`/`props`, use your own function or simple check `const isServer = typeof window === 'undefined'` or `!!context.req` or `!!context.ctx.req`.

5. `store` is not passed to wrapped component props.

6. `WrappedAppProps` was renamed to `WrapperProps`.

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
    import {Provider} from 'react-redux';
    import App from 'next/app';
    import {wrapper} from '../store';

    class MyApp extends App {
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

    }

    export default wrapper.withRedux(MyApp);
    ```

4. Follow [Next.js 6 upgrade instructions](https://github.com/zeit/next.js/issues/4239) for all your components
    (`props.router` instead of `props.url` and so on)

That's it. Your project should now work the same as before.

## Resources

* [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
* [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
* Redux Saga Example: https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e.
