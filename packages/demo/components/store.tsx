import {createStore} from 'redux';
import {MakeStore} from 'next-redux-wrapper';
import reducer from './reducer';

export interface State {
    tick: string;
    tack: string;
    toe: string;
}

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
