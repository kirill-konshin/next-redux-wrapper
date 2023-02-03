import {AnyAction} from 'redux';
import {SAGA_ACTION_SUCCESS} from './saga';

export interface State {
    page: string;
}

const initialState: State = {page: ''};

function rootReducer(state = initialState, action: AnyAction) {
    switch (action.type) {
        case SAGA_ACTION_SUCCESS:
            return {...state, page: action.data};
        default:
            return state;
    }
}

export default rootReducer;
