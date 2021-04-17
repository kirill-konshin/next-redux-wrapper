import {configureStore, createAction, createSlice, ThunkAction} from '@reduxjs/toolkit';
import {Action} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

const hydrate = createAction<AppState>(HYDRATE);

export const subjectSlice = createSlice({
    name: 'subject',

    initialState: {} as any,

    reducers: {
        setEnt(state, action) {
            return action.payload;
        },
    },

    extraReducers(builder) {
        builder.addCase(hydrate, (state, action) => {
            console.log('HYDRATE', state, action.payload);
            return {
                ...state,
                ...action.payload[subjectSlice.name],
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
    const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

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

export const selectSubject = (id: any) => (state: AppState) => state?.[subjectSlice.name]?.[id];
