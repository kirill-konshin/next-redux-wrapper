import {AnyAction} from 'redux';
import {HYDRATE} from 'next-redux-wrapper';

export interface State {
    app: string;
    page: string;
}

const reducer = (state: State = {app: 'init', page: 'init'}, action: AnyAction) => {
    switch (action.type) {
        case HYDRATE:
            if (action.payload.app === 'init') {
                delete action.payload.app;
            }
            if (action.payload.page === 'init') {
                delete action.payload.page;
            }
            return {...state, ...action.payload};
        case 'APP':
            return {...state, app: action.payload};
        case 'PAGE':
            return {...state, page: action.payload};
        default:
            return state;
    }
};

export default reducer;
