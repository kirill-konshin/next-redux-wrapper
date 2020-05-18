import {AnyAction} from 'redux';
import {HYDRATE} from 'next-redux-wrapper';
import {diff} from 'jsondiffpatch';

export interface State {
    page: string;
}

const reducer = (state: State = {page: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case HYDRATE:
            const stateDiff = diff(state, action.payload) as any;
            const wasBumpedOnClient = stateDiff?.page?.[0]?.endsWith('X');
            console.log('HYDRATE action handler', {stateDiff, wasBumpedOnClient});
            return {
                ...state,
                ...action.payload,
                page: wasBumpedOnClient ? state.page : action.payload.page,
            };
        case 'PAGE':
            return {...state, page: action.payload};
        case 'BUMP':
            return {...state, page: state.page + 'X'};
        default:
            return state;
    }
};

export default reducer;
