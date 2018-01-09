import {createStore} from "redux";

export const reducer = (state = {tick: 'init', tack: 'init'}, action) => {
    switch (action.type) {
        case 'TICK':
            return {...state, tick: action.payload};
        case 'TACK':
            return {...state, tack: action.payload};
        default:
            return state
    }
};

export const makeStore = (initialState) => {
    return createStore(reducer, initialState);
};

