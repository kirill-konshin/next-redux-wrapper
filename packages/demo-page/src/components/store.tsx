import {createStore} from 'redux';
import {MakeStore, createWrapper, Context} from 'next-redux-wrapper';
import reducer, {State} from './reducer';

export const makeStore: MakeStore<State> = (context: Context) => {
    const store = createStore(reducer);

    if (module.hot) {
        module.hot.accept('./reducer', () => {
            console.log('Replacing reducer');
            store.replaceReducer(require('./reducer').default);
        });
    }

    return store;
};

export const wrapper = createWrapper<State>(makeStore, {debug: true});
