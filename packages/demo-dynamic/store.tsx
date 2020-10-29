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

export type RootState = ReturnType<ReturnType<typeof makeStore>['getState']>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;

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

export const wrapper = createWrapper<ReturnType<typeof makeStore>>(makeStore);

export const selectSubject = id => (state: RootState) => state.subject.entities && state.subject.entities[id];
