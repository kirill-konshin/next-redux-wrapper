import {configureStore, createSlice, ThunkAction, ThunkDispatch} from '@reduxjs/toolkit';
import {AnyAction, combineReducers} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

export const subjectSlice = createSlice({
    name: 'subject',

    initialState: {
        entities: null,
    },

    reducers: {
        setEnt: (state, action) => {
            state.entities = action.payload;
        },
    },
});

const rootReducer = combineReducers({
    [subjectSlice.name]: subjectSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, void, AnyAction>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, AnyAction>;

export const fetchSubject = (id: any): AppThunk => async dispatch => {
    const timeoutPromise = timeout => new Promise(resolve => setTimeout(resolve, timeout));

    await timeoutPromise(200);

    dispatch(
        subjectSlice.actions.setEnt({
            [id]: {
                id,
                name: `Subject ${id}`,
            },
        }),
    );
};

const reducer = (state, action) => {
    console.log('Action', action);
    if (action.type === HYDRATE) {
        console.log('HYDRATE');
        return {
            ...state,
            ...action.payload,
        };
    }

    return rootReducer(state, action);
};

const makeStore = () =>
    configureStore({
        reducer,
        devTools: true,
    });

export const wrapper = createWrapper<RootState>(makeStore);

export const selectSubject = id => (state: RootState) => state.subject.entities && state.subject.entities[id];
