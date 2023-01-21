import {AnyAction} from 'redux';

export interface State {
    app: string;
    page: string;
    promise: string;
    promiseApp: string;
}

const reducer = (state: State = {app: 'init', page: 'init', promise: 'init', promiseApp: 'init'}, action: AnyAction) => {
    switch (action.type) {
        // case HYDRATE:
        //     // Ignoring initial state in subtree
        //     if (action.payload.app === 'init') {
        //         delete action.payload.app;
        //     }
        //     // Ignoring initial state in subtree
        //     if (action.payload.page === 'init') {
        //         delete action.payload.page;
        //     }
        //     return {...state, ...action.payload};
        case 'APP':
            return {...state, app: action.payload};
        case 'PAGE':
            return {...state, page: action.payload};
        case 'PROMISE_FULFILLED': // async
            return {...state, promise: action.payload};
        case 'PROMISE_APP_FULFILLED': // async
            return {...state, promiseApp: action.payload};
        default:
            return state;
    }
};

export default reducer;
