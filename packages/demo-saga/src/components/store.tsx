import {createStore, applyMiddleware, Store} from 'redux';
import logger from 'redux-logger';
import createSagaMiddleware, {Task} from 'redux-saga';
import {MakeStore, Context} from 'next-redux-wrapper';
import reducer, {State} from './reducer';
import rootSaga from './saga';

export interface SagaStore extends Store {
    sagaTask: Task;
}

export const makeStore: MakeStore<State> = (context: Context) => {
    // 1: Create the middleware
    const sagaMiddleware = createSagaMiddleware();

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(reducer, applyMiddleware(sagaMiddleware, logger));

    // 3: Run your sagas on server
    (store as SagaStore).sagaTask = sagaMiddleware.run(rootSaga);

    // 4: now return the store:
    return store;
};
