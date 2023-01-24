import {createStore, applyMiddleware, Store} from 'redux';
import logger from 'redux-logger';
import promiseMiddleware from 'redux-promise-middleware';
import {createWrapper, MakeStore} from 'next-redux-wrapper';
import reducer, {State} from './reducer';

export const makeStore: MakeStore<any> = ({context, reduxWrapperMiddleware}) => {
    const store = createStore(
        reducer,
        applyMiddleware(...[promiseMiddleware, process.browser ? logger : null, reduxWrapperMiddleware].filter(Boolean)),
    );

    if ((module as any).hot) {
        (module as any).hot.accept('./reducer', () => {
            console.log('Replacing reducer');
            store.replaceReducer(require('./reducer').default);
        });
    }

    return store;
};

export const wrapper = createWrapper<Store<State>>(makeStore, {debug: true});
