import {delay, put, takeEvery} from 'redux-saga/effects';

export const SAGA_ACTION = 'SAGA_ACTION';
export const SAGA_ACTION_SUCCESS = `${SAGA_ACTION}_SUCCESS`;

function* sagaAction() {
    yield delay(100);
    yield put({
        type: SAGA_ACTION_SUCCESS,
        data: 'async text',
    });
}

function* rootSaga() {
    yield takeEvery(SAGA_ACTION, sagaAction);
}

export default rootSaga;
