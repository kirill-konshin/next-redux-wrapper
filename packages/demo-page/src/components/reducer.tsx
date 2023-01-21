import {AnyAction} from 'redux';

export interface State {
    page: string;
}

const reducer = (state: State = {page: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case 'PAGE':
            return {...state, page: action.payload};
        case 'BUMP':
            return {...state, page: state.page + 'X'};
        default:
            return state;
    }
};

export default reducer;
