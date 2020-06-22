import {createStore, applyMiddleware, Store} from 'redux';
import logger from 'redux-logger';
import {MakeStore, createWrapper, Context} from 'next-redux-wrapper';
import reducer, {State} from './reducer';

export const makeStore: MakeStore<Store<State>> = (context: Context) => {
    const store = createStore(reducer, applyMiddleware(logger));

    if (module.hot) {
        module.hot.accept('./reducer', () => {
            console.log('Replacing reducer');
            store.replaceReducer(require('./reducer').default);
        });
    }

    return store;
};

export const wrapper = createWrapper(makeStore, {debug: true});
