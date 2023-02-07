# Redux Wrapper for Next.js

[![npm version](https://badge.fury.io/js/next-redux-wrapper.svg)](https://www.npmjs.com/package/next-redux-wrapper)
![Build status](https://travis-ci.org/kirill-konshin/next-redux-wrapper.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/kirill-konshin/next-redux-wrapper/badge.svg?branch=master)](https://coveralls.io/github/kirill-konshin/next-redux-wrapper?branch=master)

A library that brings Next.js and Redux together.

> :warning: This library does not support the new experimental `app` folder because at this moment there is no clear way to use Redux with Server Components...
>
> Components that use Redux need a `Provider` up in the tree in order to work, and `Provider` is using `Context`, which is [not available on server](https://shopify.dev/custom-storefronts/hydrogen/react-server-components/work-with-rsc#using-context-in-react-server-components) (yet?).
>
> With that said, if you are using `app` folder, I suggest to keep Redux in client components (`"use client"`), and keep server-side state outside of Redux.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Motivation](#motivation)
- [Installation](#installation)
- [Usage](#usage)
  - [Step 1. Create a store](#step-1-create-a-store)
  - [Step 2. Add store to your App](#step-2-add-store-to-your-app)
  - [Step 3. Add hydration to Pages](#step-3-add-hydration-to-pages)
    - [getStaticProps](#getstaticprops)
    - [getServerSideProps](#getserversideprops)
    - [`Page.getInitialProps`](#pagegetinitialprops)
    - [`App.getInitialProps`](#appgetinitialprops)
- [State reconciliation during hydration](#state-reconciliation-during-hydration)
- [Configuration](#configuration)
- [How it works](#how-it-works)
  - [Tips and Tricks](#tips-and-tricks)
  - [Redux Toolkit](#redux-toolkit)
  - [Server and Client state separation](#server-and-client-state-separation)
  - [Document](#document)
  - [Error Pages](#error-pages)
  - [Async actions](#async-actions)
  - [Custom serialization and deserialization](#custom-serialization-and-deserialization)
  - [Usage with Redux Saga](#usage-with-redux-saga)
  - [Usage with Redux Persist](#usage-with-redux-persist)
  - [Usage with old class-based components](#usage-with-old-class-based-components)
- [Upgrade from 8.x to 9.x](#upgrade-from-8x-to-9x)
- [Upgrade from 6.x to 7.x](#upgrade-from-6x-to-7x)
- [Upgrade from 5.x to 6.x](#upgrade-from-5x-to-6x)
- [Upgrade from 1.x to 2.x](#upgrade-from-1x-to-2x)
- [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Motivation

Setting up Redux for static single page apps is rather simple: a single Redux store has to be created that is provided to all pages.

When Next.js static site generator or server side rendering is involved, however, things start to get complicated as another store instance is needed on the server to render Redux-connected components.

Furthermore, access to the Redux `Store` may also be needed during a page's `getInitialProps`, and proper handling of complex cases like `App.getInitialProps` (when using `pages/_app`) together with `getStaticProps` or `getServerSideProps` at individual page level.

This is where `next-redux-wrapper` comes in handy: it automatically creates the store instances for you and makes sure they all have the same state.

Library provides uniform interface no matter in which Next.js data lifecycle method you would like to use the `Store`.

The hydration is performed by replaying the actions dispatched on server, in the same order.

In Next.js example https://github.com/vercel/next.js/blob/canary/examples/with-redux-thunk/store.js#L23 store is being replaced on navigation. Redux will re-render components even with memoized selectors (`createSelector` from `recompose`) if `store` is replaced: https://codesandbox.io/s/redux-store-change-kzs8q, which may affect performance of the app by causing a huge re-render of everything, even what did not change. This library makes sure `store` remains the same.

# Installation

```bash
npm install next-redux-wrapper react-redux --save
```

Note that `next-redux-wrapper` requires `react-redux` as peer dependency.

# Usage

Live example: https://codesandbox.io/s/next-redux-wrapper-demo-7n2t5.

All examples are written in TypeScript. If you're using plain JavaScript just omit type declarations. These examples use vanilla Redux, if you're using Redux Toolkit, please refer to [dedicated example](#redux-toolkit), the general setup is the same.

Next.js has several data fetching mechanisms, this library can attach to any of them. But first you have to write some common code.

## Step 1. Create a store

Create a file named `store.ts`:

```typescript
// store.ts

import {createStore, applyMiddleware, AnyAction, Store} from 'redux';
import {createWrapper, MakeStore} from 'next-redux-wrapper';

export interface State {
  tick: string;
}

// create your reducer
const reducer = (state: State = {tick: 'init'}, action: AnyAction) => {
  switch (action.type) {
    case 'TICK':
      return {...state, tick: action.payload};
    default:
      return state;
  }
};

// create a makeStore function
const makeStore: MakeStore<Store<State>> = ({context, reduxWrapperMiddleware}) =>
  createStore(reducer, applyMiddleware(reduxWrapperMiddleware)); // make sure reduxWrapperMiddleware is last, after thunk or promise middlewares

// export an assembled wrapper
export const wrapper = createWrapper<Store<State>>(makeStore, {debug: true});
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
// store.js

import {createStore, applyMiddleware} from 'redux';
import {createWrapper} from 'next-redux-wrapper';

// create your reducer
const reducer = (state = {tick: 'init'}, action) => {
  switch (action.type) {
    case 'TICK':
      return {...state, tick: action.payload};
    default:
      return state;
  }
};

// create a makeStore function
const makeStore = ({context, reduxWrapperMiddleware}) => createStore(reducer, applyMiddleware(reduxWrapperMiddleware)); // make sure reduxWrapperMiddleware is last, after thunk or promise middlewares

// export an assembled wrapper
export const wrapper = createWrapper(makeStore, {debug: true});
```

</details>

## Step 2. Add store to your App

Use `pages/_app` to wrap all pages:

```tsx
import React, {FC} from 'react';
import {Provider} from 'react-redux';
import {AppProps} from 'next/app';
import {wrapper} from '../components/store';

const MyApp: FC<AppProps> = function MyApp({Component, pageProps}) {
  const store = wrapper.useStore();
  return (
    <Provider store={store}>
      <Component {...(pageProps as any)} />
    </Provider>
  );
};
```

## Step 3. Add hydration to Pages

**Each page has to call `wrapper.useHydration(props)` in order to perform hydration.** If page won't use `wrapper.useHydration` — this page will not be hydrated, even if it has `getServerSideProps` or other data functions.

```tsx
import React from 'react';
import {NextPage} from 'next';
import {useSelector} from 'react-redux';
import {wrapper, State, getSomeValue} from '../store';

const Page: NextPage = props => {
  const {hydrating} = wrapper.useHydration(props); // dump all props to hook
  const {someValue} = useSelector(getSomeValue);
  if (hydrating) return <div>Loading...</div>;
  return <div>{someValue}</div>;
};

export default Page;
```

<details>
<summary>Same code in JavaScript (without types)</summary>

```js
// store.js
import React from 'react';
import {useSelector} from 'react-redux';
import {wrapper, State, getSomeValue} from '../store';

const Page = props => {
  const {hydrating} = wrapper.useHydration(props); // dump all props to hook
  const {someValue} = useSelector(getSomeValue);
  if (hydrating) return <div>Loading...</div>;
  return <div>{someValue}</div>;
};

export default Page;
```

</details>

:warning: **Since hydration can happen both on first visit and on subsequent navigation (then hydration will be asynchronous) `getSomeValue` selector has to safely handle empty store state. Component will be rendered twice, with empty state, and after hydration. Write selectors like so `export const getSomeValue = createSelector(getAnotherValue, s => s?.someValue);`.**.

You can use `hydrating` variable to understand the status of the hydration and show loading screen if needed.

The `wrapper.useHydration` hook needs access to special props supplied to component: `initialStateGSSP`, `initialStateGSP`, `initialStateGIAP`, `initialStateGIPP`. You can destructure `props` to pull out those you use directly, just make sure to provide special ones to the hook:

```js
const Page = ({foo, bar, ...props}) => {
  wrapper.useHydration(props);
  // ... rest of code
};
```

If you have lots of legacy selectors that assume store is pre-hydrated before render, you can use approach for [usage with old class-based components](#usage-with-old-class-based-components): `withHydration` HOC to delay rendering until store is hydrated. In this case make sure such selectors are not used anywhere except on the wrapped page.

### getStaticProps

This section describes how to attach to [getStaticProps](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) lifecycle function.

Let's create a page in `pages/pageName.tsx`:

```js
import {wrapper} from '../store';

export const getStaticProps = wrapper.getStaticProps(store => ({preview}) => {
  store.dispatch({type: 'TICK', payload: 'was set in other page ' + preview});
  return {props: {foo: 'bar'}}; // your ususal props
});

// ... usual Page component code
```

### getServerSideProps

This section describes how to attach to [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) lifecycle function.

Let's create a page in `pages/pageName.tsx`:

```js
import {wrapper} from '../store';

export const getServerSideProps = wrapper.getServerSideProps(store => ({req, res, ...etc}) => {
  store.dispatch({type: 'TICK', payload: 'was set in other page'});
  return {props: {foo: 'bar'}}; // your ususal props
});

// ... usual Page component code
```

### `Page.getInitialProps`

```js
import {wrapper} from '../store';

// ... usual Page component code

Page.getInitialProps = wrapper.getInitialPageProps(store => ({pathname, req, res}) => {
  store.dispatch({type: 'TICK', payload: 'was set in error page ' + pathname});
  return {foo: 'bar'}; // your ususal props
});
```

:warning: `req` and `res` are not available if `getInitialProps` is called on client side during navigation.

### `App.getInitialProps`

:warning: Not recommended! :warning:

You can dispatch actions from the `pages/_app` too. This mode is not compatible with [Next.js 9's Auto Partial Static Export](https://nextjs.org/blog/next-9#automatic-partial-static-export) feature, see the [explanation below](#automatic-partial-static-export).

```js
// pages/_app.tsx

import React from 'react';
import App from 'next/app';
import {wrapper} from '../components/store';

// ... usual MyApp code

MyApp.getInitialProps = wrapper.getInitialAppProps(store => async context => {
  store.dispatch({type: 'TOE', payload: 'was set in _app'});

  return {
    pageProps: {
      // https://nextjs.org/docs/advanced-features/custom-app#caveats
      ...(await App.getInitialProps(context)).pageProps,
      // Some custom thing for all pages
      pathname: ctx.pathname,
    },
  };
});

export default MyApp;
```

:warning: `req` and `res` are not available if `App.getInitialProps` or `Page.getInitialProps` are called on client side during navigation. And the actions dispatched from `App.getInitialProps` or `Page.getInitialProps` will be dispatched on client side.

All pages still can have all standard data lifecycle methods, with one common pitfall:

:warning: You can use `getStaticProps` at page level while having `App.getInitialProps`, this scenario is supported, but I highly don't recommend to do this.

# State reconciliation during hydration

Each time when the user opens a page containing the `useHydration` hook, the actions performed on server will be dispatched on client as well. This may happen during initial page load and during regular page navigation. Your reducer must merge it with existing client state properly. This means "toggle" actions are not supported, each action has to analyze what's in the state and do things properly.

Best way is to use [server and client state separation](#server-and-client-state-separation).

Another way is to use https://github.com/benjamine/jsondiffpatch to analyze diff and apply it properly, or any other way to determine which state subtrees were modified.

```js
// create your reducer
const reducer = (state = {tick: 'init'}, action) => {
  switch (action.type) {
    case 'TICK':
      const wasBumpedOnClient = state.tick !== 'init'; // or any other criteria
      return {...state, tick: wasBumpedOnClient ? state.tick : action.payload};
    default:
      return state;
  }
};
```

# Configuration

The `createWrapper` function accepts `makeStore` as its first argument. The `makeStore` function should return a new Redux `Store` instance each time it's called, **no memoization is needed here**, it is automatically done inside the wrapper.

`createWrapper` also optionally accepts a config object as a second parameter:

- `debug` (optional, boolean) : enable debug logging
- `serialize` and `deserialize` (optional, function): custom functions for serializing and deserializing the actions, see [Custom serialization and deserialization](#custom-serialization-and-deserialization)

When `makeStore` is invoked it is provided with a Next.js context, which could be [`NextPageContext`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps) or [`AppContext`](https://nextjs.org/docs/advanced-features/custom-app) or [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) context depending on which lifecycle function you will wrap.

Some of those contexts (`getServerSideProps` always, and `NextPageContext`, `AppContext` sometimes if page is rendered on server) can have request and response related properties:

- `req` (`IncomingMessage`)
- `res` (`ServerResponse`)

Although it is possible to create server or client specific logic in both `makeStore`, I highly recommend that they do not have different behavior. This may cause errors and checksum mismatches which in turn will ruin the whole purpose of server rendering.

# How it works

Using `next-redux-wrapper` ("the wrapper"), the following things happen on a request:

- Phase 1: `getInitialProps`/`getStaticProps`/`getServerSideProps`

  - The wrapper creates a server-side store (using `makeStore`) with an empty initial state.
  - The wrapper calls the `_app`'s `getInitialProps` (if any) function and passes the previously created store.
  - Next.js takes the props returned from the `_app`'s `getInitialProps` method, as well as a serialized list of actions that were dispatched.
  - The wrapper calls the Page's `getXXXProps` function and passes the previously created store.
  - Next.js takes the props returned from the Page's `getXXXProps` method, as well as a serialized list of actions that were dispatched.

- Phase 2: SSR

  - The wrapper creates a new store using `makeStore`
  - The wrapper replays all actions dispatched on Phase 1
  - Resulting HTML is emitted to browser
  - **Connected components may dispatch actions in this phase too, but they will not be replayed on the client.**

- Phase 3: Client

  - The wrapper creates a new store
  - The wrapper replays all actions dispatched in Phase 1

- Phase 4: Soft client navigation (without reload)
  - The wrapper reuses same client store
  - The wrapper idles if no `getServerSideProps` or `getStaticProps` were used on the page, otherwise the wrapper replays all actions dispatched in Phase 1 of the new page

**Note:** The client's state is not persisted across requests (i.e. Phase 1 always starts with an empty state). Hence, it is reset on page reloads. Consider using [Redux persist](#usage-with-redux-persist) if you want to persist state between page reloads or hard navigation.

## Tips and Tricks

## Redux Toolkit

Wrapper has first-class support of `@reduxjs/toolkit`.

Full example: https://github.com/kirill-konshin/next-redux-wrapper/blob/master/packages/demo-redux-toolkit.

```ts
import {configureStore, createSlice, ThunkAction} from '@reduxjs/toolkit';
import {Action} from 'redux';
import {createWrapper} from 'next-redux-wrapper';

export const subjectSlice = createSlice({
  name: 'subject',

  initialState: {} as any,

  reducers: {
    setEnt(state, action) {
      return action.payload;
    },
  },
});

const makeStore = ({reduxWrapperMiddleware}) =>
  configureStore({
    reducer: {
      [subjectSlice.name]: subjectSlice.reducer,
    },
    devTools: true,
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(reduxWrapperMiddleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

export const fetchSubject =
  (id: any): AppThunk =>
  async dispatch => {
    const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

    await timeoutPromise(200);

    dispatch(
      subjectSlice.actions.setEnt({
        [id]: {
          id,
          name: `Subject ${id}`,
        },
      }),
    );
  };

export const wrapper = createWrapper<AppStore>(makeStore);

export const selectSubject = (id: any) => (state: AppState) => state?.[subjectSlice.name]?.[id];
```

It is recommended to export typed `State` and `ThunkAction`:

```ts
export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;
```

## Server and Client state separation

Each time when pages that have `getStaticProps` or `getServerSideProps` or `getStaticProps` are opened by user the `HYDRATE` action will be dispatched. The `payload` of this action will contain the `state` at the moment of static generation or server side rendering, so your reducer must merge it with existing client state properly.

The easiest and most stable way to make sure nothing is accidentally overwritten is to make sure that your reducer applies client side and server side actions to different substates of your state and they never clash:

```js
const reducer = (state = {tick: 'init'}, action) => {
  switch (action.type) {
    case 'SERVER_ACTION':
      return {
        ...state,
        server: {
          // only change things in server subtree
          ...state.server,
          tick: action.payload,
        },
      };
    case 'CLIENT_ACTION':
      return {
        ...state,
        client: {
          // only change things in client subtree
          ...state.client,
          tick: action.payload,
        },
      };
    default:
      return state;
  }
};
```

If you prefer an isomorphic approach for some (preferably small) portions of your state, you can share them between client and server on server-rendered pages using [next-redux-cookie-wrapper](https://github.com/bjoluc/next-redux-cookie-wrapper), an extension to next-redux-wrapper. In this case, for selected substates, the server is aware of the client's state (unless in `getStaticProps`) and there is no need to separate server and client state.

Also, you can use a library like https://github.com/benjamine/jsondiffpatch to analyze diff and apply it properly.

## Document

Do not use this library in `pages/_document.js`, Next.JS [does not provide](https://github.com/zeit/next.js/issues/1267) a reliable way to determine the sequence when components will be rendered. So per Next.JS recommendation it is better to have just data-agnostic things in `pages/_document`.

## Error Pages

Error pages can also be wrapped the same way as any other pages.

Transition to an error page (`pages/_error.js` template) will cause `pages/_app.js` to be applied but it is always a
full page transition (not HTML5 pushState), so client will have the store created from scratch using state from the server.
So unless you persist the store on the client somehow the resulting previous client state will be ignored.

## Async actions

You can use https://github.com/reduxjs/redux-thunk to dispatch async actions:

```js
function someAsyncAction(id) {
  return async function (dispatch, getState) {
    return someApiCall(id).then(res => {
      dispatch({
        type: 'FOO',
        payload: res,
      });
    });
  };
}

// usage
await store.dispatch(someAsyncAction());
```

You can also install https://github.com/pburtchaell/redux-promise-middleware in order to dispatch Promises as async actions. Follow the installation guide of the library, then you'll be able to handle it like this:

```js
function someAsyncAction() {
  return {
    type: 'FOO',
    payload: new Promise(resolve => resolve('foo')),
  };
}

// usage
await store.dispatch(someAsyncAction());
```

## Custom serialization and deserialization

If you are storing complex types such as Immutable.JS or JSON objects in your state, a custom serialize and deserialize
handler might be handy to serialize the actions on the server and deserialize it again on the client. To do so,
provide `serialize` and `deserialize` as config options to `createStore`.

Both functions should take an array of actions and return an array of actions. `serialize` should remove all non-transferable objects and `deserialize` should return whatever your store can consume.

The reason is that state snapshot is transferred over the network from server to client as a plain object.

Example of a custom serialization of an Immutable.JS state using `json-immutable`:

```js
const {serialize, deserialize} = require('json-immutable');

createWrapper({
  serialize: actions => actions.map(action => ({...action, payload: serialize(action.payload)})),
  deserialize: actions => actions.map(action => ({...action, payload: deserialize(action.payload)})),
});
```

Same thing using Immutable.JS:

```js
const {fromJS} = require('immutable');

createWrapper({
  serialize: actions => actions.map(action => ({...action, payload: action.payload.toJS()})),
  deserialize: actions => actions.map(action => ({...action, payload: fromJS(action)})),
});
```

You can also filter out actions that you don't want to dispatch on client (or even add actions that should only be dispatched on client, although latter it's not recommended). This approach may be useful for [sagas](#usage-with-redux-saga) to remove unnecessary actions from client:

```js
export const wrapper = createWrapper(makeStore, {
  serialize: actions => actions.filter(action => action.type !== 'xxx'),
});
```

## Usage with Redux Saga

[Note, this method _may_ be unsafe - make sure you put a lot of thought into handling async sagas correctly. Race conditions happen very easily if you aren't careful.] To utilize Redux Saga, one simply has to make some changes to their `makeStore` function. Specifically, `redux-saga` needs to be initialized inside this function, rather than outside of it. (I did this at first, and got a nasty error telling me `Before running a Saga, you must mount the Saga middleware on the Store using applyMiddleware`). Here is how one accomplishes just that. This is just slightly modified from the setup example at the beginning of the docs. Keep in mind that this setup will opt you out of Automatic Static Optimization: https://err.sh/next.js/opt-out-auto-static-optimization.

Don't forget to filter out actions that cause saga to run using [`serialize`](#custom-serialization-and-deserialization) config property.

Create your root saga as usual, then implement the store creator:

```js
import {createStore, applyMiddleware} from 'redux';
import {createWrapper} from 'next-redux-wrapper';
import createSagaMiddleware from 'redux-saga';
import reducer from './reducer';
import rootSaga, {SAGA_ACTION} from './saga';

export const makeStore = ({context, reduxWrapperMiddleware}) => {
  // 1: Create the middleware
  const sagaMiddleware = createSagaMiddleware();

  // 2: Add an extra parameter for applying middleware:
  const store = createStore(reducer, applyMiddleware(sagaMiddleware, reduxWrapperMiddleware));

  // 3: Run your sagas on server
  store.sagaTask = sagaMiddleware.run(rootSaga);

  // 4: now return the store:
  return store;
};

const filterActions = ['@@redux-saga/CHANNEL_END', SAGA_ACTION];

export const wrapper = createWrapper(makeStore, {
  serialize: actions => actions.filter(action => !filterActions.includes(action.type)), // !!! don't forget to filter out actions that cause saga to run
});
```

#### Using `getServerSideProps` or `getStaticProps`

If you don't want to opt-out of automatic pre-rendering in your Next.js app, you can manage server-called sagas on a per page basis like [the official Next.js "with Redux Saga" example](https://github.com/vercel/next.js/tree/canary/examples/with-redux-saga) does. If you do go with this option, please ensure that you await any and all sagas within any [Next.js page methods](https://nextjs.org/docs/basic-features/data-fetching). If you miss it on one of pages you'll end up with inconsistent state being sent to client.

In order to use it with `getServerSideProps` or `getStaticProps` you need to `await` for sagas in each page's handler:

```js
export const getServerSideProps = wrapper.getServerSideProps(store => async ({req, res, ...etc}) => {
  // regular stuff
  store.dispatch(ApplicationSlice.actions.updateConfiguration());
  // end the saga
  store.dispatch(END);
  await store.sagaTask.toPromise();
});
```

#### Using `App.getInitialProps`

:warning: Not Recommended! :warning:

Then in the `pages/_app` wait stop saga and wait for it to finish when execution is on server:

```js
import React from 'react';
import App from 'next/app';
import {END} from 'redux-saga';
import {SagaStore, wrapper} from '../components/store';

// ... usual MyApp code

MyApp.getInitialProps = wrapper.getInitialAppProps(store => async context => {
  // 1. Wait for all page actions to dispatch
  const pageProps = {
    // https://nextjs.org/docs/advanced-features/custom-app#caveats
    ...(await App.getInitialProps(context)).pageProps,
  };

  // 2. Stop the saga if on server
  if (context.ctx.req) {
    store.dispatch(END);
    await store.sagaTask.toPromise();
  }

  // 3. Return props
  return {pageProps};
});

export default MyApp;
```

## Usage with Redux Persist

> If you only need to persist small portions of your state, [next-redux-cookie-wrapper](https://github.com/bjoluc/next-redux-cookie-wrapper) might be an easy alternative to Redux Persist that supports SSR.

Boilerplate: https://github.com/fazlulkarimweb/with-next-redux-wrapper-redux-persist

Honestly, I think that putting a persistence gate is not necessary because the server can already send _some_ HTML with
_some_ state, so it's better to show it right away and then wait for `REHYDRATE` action to happen to show additional
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
      fromClient: payload,
    };
  }
  return state;
};

const makeStore = ({context, reduxWrapperMiddleware}) => {
  const isServer = typeof window === 'undefined';

  const makeConfiguredStore = reducer => createStore(reducer, undefined, applyMiddleware(logger, reduxWrapperMiddleware));

  if (isServer) {
    return makeConfiguredStore(reducer);
  } else {
    // we need it only on client side
    const {persistStore, persistReducer} = require('redux-persist');
    const storage = require('redux-persist/lib/storage').default;

    const persistConfig = {
      key: 'nextjs',
      whitelist: ['fromClient'], // make sure it does not clash with server keys
      storage,
    };

    const persistedReducer = persistReducer(persistConfig, reducer);
    const store = makeConfiguredStore(persistedReducer);

    store.__persistor = persistStore(store); // Nasty hack

    return store;
  }
};

export const wrapper = createWrapper(makeStore);

export const setClientState = clientState => ({
  type: SET_CLIENT_STATE,
  payload: clientState,
});
```

Then add store & persistor to `_app`:

```js
// pages/_app.tsx
import React from 'react';
import App from 'next/app';
import {useStore} from 'react-redux';
import {wrapper} from './lib/redux';
import {PersistGate} from 'redux-persist/integration/react';

const Persistor = ({Component, pageProps}) => {
  const store = useStore();
  return (
    <PersistGate persistor={store.__persistor} loading={<div>Loading</div>}>
      <Component {...pageProps} />
    </PersistGate>
  );
};

const MyApp = props => {
  const store = wrapper.useStore();
  return (
    <Provider store={store}>
      <Persistor {...props} />
    </Provider>
  );
};

export default MyApp;
```

And then in Next.js page:

```js
// pages/index.js
import React from 'react';
import {useSelector, useDispatch} from 'react-redux';

export default ({fromServer, fromClient, setClientState}) => {
  const {fromServer, fromClient} = useSelector(state => state);
  const dispatch = useDispatch();
  return (
    <div>
      <div>fromServer: {fromServer}</div>
      <div>fromClient: {fromClient}</div>
      <div>
        <button onClick={e => dispatch(setClientState('bar'))}>Set Client State</button>
      </div>
    </div>
  );
};
```

## Usage with old class-based components

#### App

If you're still using old class-based

```js
class MyApp extends React.Component {
  public static getInitialProps = wrapper.getInitialAppProps(store => async context => {
    // https://nextjs.org/docs/advanced-features/custom-app#caveats
    const pageProps = (await App.getInitialProps(context)).pageProps;
    return {pageProps};
  });

  public render() {
    const {Component, pageProps} = this.props;
    return <Component {...pageProps} />;
  }
}

const withStore = (Component) => {

    const WrappedComponent = (props: any) => (
        <Provider store={wrapper.useStore()}>
            <Component {...props} />
        </Provider>
    );

    WrappedComponent.displayName = `withRedux(${Component.displayName || Component.name || 'Component'})`;

    // also you can use hoist-non-react-statics package
    if ('getInitialProps' in Component) {
        WrappedComponent.getInitialProps = Component.getInitialProps;
    }

    return WrappedComponent;
};

export default withStore(MyApp);
```

:warning: Do not use `class MyApp extends App`, use `class MyApp extends React.Component` :warning:

Next.js provides [generic `getInitialProps`](https://github.com/vercel/next.js/blob/canary/packages/next/src/pages/_app.tsx#L39) which will be picked up by wrapper, so you **must not extend `App`** as you'll be opted out of Automatic Static Optimization: https://err.sh/next.js/opt-out-auto-static-optimization. Just export a regular Functional Component or extend `React.Component` as in the example above.

#### Pages

```js
function DefaultLoading() {
  return null;
}

// put this into your library
const withHydration = (Component: NextComponentType | any, {Loading = DefaultLoading}: {Loading?: React.ComponentType}) => {
  const WrappedComponent = (props: any) => (wrapper.useHydration(props).loading ? <Loading /> : <Component {...props} />);

  WrappedComponent.displayName = `withHydration(${Component.displayName || Component.name || 'Component'})`;

  if ('getInitialProps' in Component) {
    WrappedComponent.getInitialProps = Component.getInitialProps;
  }

  return WrappedComponent;
};

class Page extends React.Component {
  static getInitialProps = wrapper.getInitialPageProps(state => ({req}) => {});

  render() {
    return <div>{this.props.xxx}</div>;
  }
}

// and apply withHydration to all class-based pages
export default connect(state => state)(
  withHydration(Page, {
    Loading() {
      return <div>Loading...</div>;
    },
  }),
);
```

# Upgrade from 8.x to 9.x

1. `HYDRATE` action has been removed, all actions are replayed as-is

2. `addStoreToContext` option is discontinued

3. Pages wrapped with App, that has `getInitialProps` will not receive `store` in `context`, change:

   ```
   public static async getInitialProps({store, pathname, query, req}: NextPageContext) {
   ```

   to

   ```
   public static getInitialProps = wrapper.getInitialPageProps(store => async ({pathname, query, req}) => {
   ```

4. `const {store, props} = wrapper.useWrappedStore(rest);` is now `const store = wrapper.useStore();`

5. Each page need to call `wrapper.useHydration(props)`

6. All legacy HOCs are were removed, please use [custom ones](#usage-with-old-class-based-components) if you still need them, but I suggest to rewrite code into functional components and hooks

7. `serializeState` and `deserializeState` were removed, use `serialize` and `deserialize`

8. `const makeStore = (context) => {...}` is now `const makeStore = ({context, reduxWrapperMiddleware})`, you must add `reduxWrapperMiddleware` to your store

# Upgrade from 6.x to 7.x

1. Signature of `createWrapper` has changed: instead of `createWrapper<State>` you should use `createWrapper<Store<State>>`, all types will be automatically inferred from `Store`.

2. `GetServerSidePropsContext` and `GetStaticPropsContext` are no longer exported from `next-redux-wrapper`, you should use `GetServerSideProps`, `GetServerSidePropsContext`, `GetStaticProps` and `GetStaticPropsContext` directly from `next`.

3. All signatures like `({store, req, res, ...}) => { ... }` were changed to `store => ({req, res, ...}) => { ... }` in order to keep Next.js internals free of modifications and for better typings support.

4. In version `7.x` you have to manually wrap all `getInitialProps` with proper wrappers: `wrapper.getInitialPageProps` and `wrapper.getInitialAppProps`.

5. **window.NEXT_REDUX_WRAPPER_STORE** has been removed as it was causing [issues with hot reloading](https://github.com/kirill-konshin/next-redux-wrapper/pull/324)

# Upgrade from 5.x to 6.x

Major change in the way how things are wrapped in version 6.

1. Default export `withRedux` is marked deprecated, you should create a wrapper `const wrapper = createWrapper(makeStore, {debug: true})` and then use `wrapper.withRedux(MyApp)`.

2. Your `makeStore` function no longer gets `initialState`, it only receives the context: `makeStore(context: Context)`. Context could be [`NextPageContext`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps) or [`AppContext`](https://nextjs.org/docs/advanced-features/custom-app) or [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering) context depending on which lifecycle function you will wrap. Instead, you need to handle the `HYDRATE` action in the reducer. The `payload` of this action will contain the `state` at the moment of static generation or server side rendering, so your reducer must merge it with existing client state properly.

3. `App` should no longer wrap its children with `Provider`, it is now done internally.

4. `isServer` is not passed in `context`/`props`, use your own function or simple check `const isServer = typeof window === 'undefined'` or `!!context.req` or `!!context.ctx.req`.

5. `store` is not passed to wrapped component props.

6. `WrappedAppProps` was renamed to `WrapperProps`.

# Upgrade from 1.x to 2.x

If your project was using Next.js 5 and Next Redux Wrapper 1.x these instructions will help you to upgrade to 2.x.

1. Upgrade Next.js and Wrapper

   ```bash
   $ npm install next@6 --save-dev
   $ npm install next-redux-wrapper@latest --save
   ```

2. Replace all usages of `import withRedux from "next-redux-wrapper";` and `withRedux(...)(WrappedComponent)` in all
   your pages with plain React Redux `connect` HOC:

   ```
   import {connect} from "react-redux";

   export default connect(...)(WrappedComponent);
   ```

   You also may have to reformat your wrapper object-based config to simple React Redux config.

3. Create the `pages/_app.js` file with the following minimal code:

   ```
   // pages/_app.js
   import React from 'react'
   import {Provider} from 'react-redux';
   import App from 'next/app';
   import {wrapper} from '../store';

   class MyApp extends App {
       static async getInitialProps = (context) => ({
           pageProps: {
               // https://nextjs.org/docs/advanced-features/custom-app#caveats
               ...(await App.getInitialProps(context)).pageProps,
           }
       });

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

# Resources

- [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
- [How to use with Redux and Redux Saga](https://www.robinwieruch.de/nextjs-redux-saga/)
- [Redux Saga Example](https://gist.github.com/pesakitan22/94b4984140ba0f2c9e52c5289a7d833e)
- [next-redux-cookie-wrapper](https://github.com/bjoluc/next-redux-cookie-wrapper)
