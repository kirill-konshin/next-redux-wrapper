import {createStore} from 'redux';
import {MakeStore} from 'next-redux-wrapper';
import reducer, {State} from './reducer';

export const makeStore: MakeStore = (initialState: State) => {
    const store = createStore(reducer, initialState);

    if (module.hot) {
        module.hot.accept('./reducer', () => {
            console.log('Replacing reducer');
            store.replaceReducer(require('./reducer').default);
        });
    }

    return store;
};
