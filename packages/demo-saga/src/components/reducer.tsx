import {AnyAction} from 'redux';
import {HYDRATE} from 'next-redux-wrapper';
import {SAGA_ACTION_SUCCESS} from './saga';

export interface State {
    page: string;
}

const initialState: State = {page: ''};

function rootReducer(state = initialState, action: AnyAction) {
    switch (action.type) {
        case HYDRATE:
            return {...state, ...action.payload};
        case SAGA_ACTION_SUCCESS:
            return {...state, page: action.data};
        default:
            return state;
    }
}

export default rootReducer;
