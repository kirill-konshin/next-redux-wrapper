import {configureStore, createSelector, createSlice, PayloadAction, ThunkAction} from '@reduxjs/toolkit';
import {Action, combineReducers} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

// Model
interface SubjectPageData {
    id: string;
    name: string;
    stateTimestamp: number;
}

interface SubjectPageState {
    data: SubjectPageData | null;
}

// Slice
const initialState: SubjectPageState = {
    data: null,
};

const slice = createSlice({
    name: 'subjectPage',
    initialState,
    reducers: {
        subjectPageLoaded(state, {payload}: PayloadAction<SubjectPageState>) {
            state.data = payload.data;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            console.log('HYDRATE', action.payload);

            return {
                ...state,
                ...action.payload.subjectPage,
            };
        },
    },
});

// Store setup
const reducers = {subjectPage: slice.reducer};

const reducer = combineReducers(reducers);

const makeStore = () => configureStore({reducer});

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

export const wrapper = createWrapper<AppStore>(makeStore);

// Thunk
export const fetchSubject =
    (id: string): AppThunk =>
    async dispatch => {
        const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

        await timeoutPromise(200);

        dispatch(
            slice.actions.subjectPageLoaded({
                data: {
                    id,
                    name: `Subject ${id}`,
                    stateTimestamp: new Date().getTime(),
                },
            }),
        );
    };

// Selectors
const subjectPageSlice = (state: AppState): SubjectPageState => state.subjectPage;

const selectSubjectPageData = createSelector(subjectPageSlice, s => s.data);

// If your state for a page has nested properties, then you need optional chaining here, otherwise you'll get a null
// pointer exception when you do client side routing to a page whose slice state wasn't present before the routing.
// This happens because the render of the new page occurs before the hydration, as useWrappedStore uses a
// useLayoutEffect. However, this also means that the hydration will occur before the paint, so the user will never
// see UI based on the state data suddenly appear or disappear.
export const selectSubjectPageId = createSelector(selectSubjectPageData, s => s?.id);
export const selectSubjectPageName = createSelector(selectSubjectPageData, s => s?.name);
export const selectSubjectPageStateTimestamp = createSelector(selectSubjectPageData, s => s?.stateTimestamp);
