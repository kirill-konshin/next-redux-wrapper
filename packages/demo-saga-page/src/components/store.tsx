import {createStore, applyMiddleware, Store} from 'redux';
import logger from 'redux-logger';
import createSagaMiddleware, {Task} from 'redux-saga';
import {createWrapper} from 'next-redux-wrapper';
import reducer, {State} from './reducer';
import rootSaga, {SAGA_ACTION} from './saga';

export interface SagaStore extends Store<State> {
    sagaTask: Task;
}

const makeStore = ({reduxWrapperMiddleware}) => {
    // 1: Create the middleware
    const sagaMiddleware = createSagaMiddleware();

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(
        reducer,
        applyMiddleware(...[sagaMiddleware, process.browser ? logger : null, reduxWrapperMiddleware].filter(Boolean)),
    );

    // 3: Run your sagas on server
    (store as SagaStore).sagaTask = sagaMiddleware.run(rootSaga);

    // 4: now return the store:
    return store;
};

export const wrapper = createWrapper<SagaStore>(makeStore as any, {
    debug: true,
    actionFilter: action => action.type !== SAGA_ACTION,
});
