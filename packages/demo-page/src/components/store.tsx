import {createStore, applyMiddleware, Store} from 'redux';
import logger from 'redux-logger';
import {createWrapper, Context} from 'next-redux-wrapper';
import reducer, {State} from './reducer';

export const makeStore = (context: Context) => {
    const store = createStore(reducer, applyMiddleware(logger));

    if ((module as any).hot) {
        (module as any).hot.accept('./reducer', () => {
            console.log('Replacing reducer');
            store.replaceReducer(require('./reducer').default);
        });
    }

    return store;
};

export const wrapper = createWrapper<Store<State>>(makeStore, {debug: true});
