import {configureStore, createAction, createSlice, ThunkAction} from '@reduxjs/toolkit';
import {Action} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

const hydrate = createAction(HYDRATE);

export const subjectSlice = createSlice({
    name: 'subject',

    initialState: {
        entities: null,
    },

    reducers: {
        setEnt(state, action) {
            state[subjectSlice.name] = action.payload;
        },
    },

    extraReducers(builder) {
        builder.addCase(hydrate, (state, action) => {
            console.log('HYDRATE', state[subjectSlice.name], action.payload);
            return {
                ...state[subjectSlice.name],
                ...(action.payload as any)[subjectSlice.name],
            };
        });
    },
});

const makeStore = () =>
    configureStore({
        reducer: {
            [subjectSlice.name]: subjectSlice.reducer,
        },
        devTools: true,
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

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

export const wrapper = createWrapper<AppStore>(makeStore);

export const selectSubject = id => (state: AppState) => state.subject.entities && state.subject.entities[id];
