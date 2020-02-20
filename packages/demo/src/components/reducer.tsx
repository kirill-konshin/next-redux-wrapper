import {AnyAction} from 'redux';

export interface State {
    tick: string;
    tack: string;
    toe: string;
}

const reducer = (state: State = {tick: 'init', tack: 'init', toe: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case 'TICK':
            return {...state, tick: action.payload};
        case 'TACK':
            return {...state, tack: action.payload};
        case 'TOE':
            return {...state, toe: action.payload};
        default:
            return state;
    }
};

export default reducer;
