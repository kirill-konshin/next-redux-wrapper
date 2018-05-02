import {createStore} from "redux";
import reducer from "./reducer";

export const makeStore = (initialState) => {

    const store = createStore(reducer, initialState);

    if (module.hot) {
        module.hot.accept('./reducer', () => {
            console.log('Replacing reducer');
            store.replaceReducer(require('./reducer').default);
        });
    }

    return store;

};

