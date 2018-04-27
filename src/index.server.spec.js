/**
 * @jest-environment node
 */

import React from "react";
import {applyMiddleware, createStore} from "redux";
import promiseMiddleware from "redux-promise-middleware";
import renderer from "react-test-renderer";
import wrapper from "./index";

const makeStore = (initialState) => {
  return createStore((s) => s, initialState, applyMiddleware(promiseMiddleware()));
};

describe('createStore', () => {
    describe('On the server', () => {
        test('should create new store for server each time', async () => {
            const mock = jest.fn().mockReturnValue(makeStore({}));
            const App = ({foo}) => (<div>{foo}</div>);
            const WrappedApp = wrapper(mock)(App);
            const component = renderer.create(<WrappedApp store={makeStore({})}/>);
            await WrappedApp.getInitialProps({
                req: {}
            });
            expect(component.toJSON()).toMatchSnapshot();
            await WrappedApp.getInitialProps({
                req: {}
            });
            expect(mock).toHaveBeenCalledTimes(2);
        });

        test('setup store on server and use next.js page context params', async () => {
            const App = ({foo}) => (<div>{foo}</div>);
            const WrappedApp = wrapper({
                createStore: (initialState, options) => {
                    expect(options.isServer).toBe(true);
                    expect(options.query).toBeDefined();
                    expect(options.req).toBeDefined();
                    return createStore((s => s), initialState, applyMiddleware(promiseMiddleware()));
                }
            })(App);
            const component = renderer.create(<WrappedApp store={makeStore({})}/>);
            await WrappedApp.getInitialProps({
                req: {},
                query: {}
            });
            expect(component.toJSON()).toMatchSnapshot();
        });
        
        test('usage of custom state serialization', async () => {
            const initialAppProps = ({ testProps: 'foo' });
            const initialAppState = ({ testState: 'baz' });
            const App = ({foo}) => (<div>{foo}</div>);
            App.getInitialProps = ({ store }) => {
                store.dispatch({ type: 'TEST_ACTION' })
                return initialAppProps;
            };
            const WrappedApp = wrapper({
                createStore: (initialState, options) => {
                    return createStore((s => initialAppState), initialState, applyMiddleware(promiseMiddleware()));
                },
                serializeState: function(state) { return {...state, serialized: true}; }
            })(App);
            
            const result = await WrappedApp.getInitialProps({
                req: {},
                query: {}
            });
            
            expect(result.initialProps).toEqual(initialAppProps);
            expect(result.initialState).toHaveProperty('testState', 'baz');
            expect(result.initialState).toHaveProperty('serialized', true);
        });
    });
});