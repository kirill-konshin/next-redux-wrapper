import {createStore, applyMiddleware, Store} from 'redux';
import logger from 'redux-logger';
import createSagaMiddleware, {Task} from 'redux-saga';
import {Context, createInitSagaMonitor, createWrapper, InitSagaMonitor} from 'next-redux-wrapper';
import reducer from './reducer';
import rootSaga from './saga';

export interface SagaStore extends Store {
    initMonitor: InitSagaMonitor;
    sagaTask: Task;
}

const INITIALIZATION_TIMEOUT = 30_000; // 30 seconds

export const makeStore = (context: Context) => {
    // 1: Create the middleware
    const initMonitor = createInitSagaMonitor(INITIALIZATION_TIMEOUT);
    const sagaMiddleware = createSagaMiddleware({sagaMonitor: initMonitor.monitor});

    // 2: Add an extra parameter for applying middleware:
    const store = createStore(reducer, applyMiddleware(sagaMiddleware, logger));

    // 3: Run your sagas on server
    const sagaTask = sagaMiddleware.run(rootSaga);

    // 4: Now return the store with access to init monitor and root saga task
    return Object.assign(store, {
        initMonitor,
        sagaTask,
    });
};

export const wrapper = createWrapper<SagaStore>(makeStore as any);
