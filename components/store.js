import {createStore} from "redux";

export const reducer = (state = {reduxStatus: 'init'}, action) => {
    switch (action.type) {
        case 'TICK':
            return {reduxStatus: action.payload};
        default:
            return state
    }
};

export const makeStore = (initialState) => {
    return createStore(reducer, initialState);
};

