import {configureStore, createSelector, createSlice, PayloadAction, ThunkAction} from '@reduxjs/toolkit';
import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import {Action, combineReducers} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

// Subject page model
interface SubjectPageData {
    id: string;
    name: string;
    stateTimestamp: number;
}

interface SubjectPageState {
    data: SubjectPageData | null;
}

const subjectPageInitialState: SubjectPageState = {
    data: null,
};

// Subject page slice approach
const subjectPageSlice = createSlice({
    name: 'subjectPage',
    initialState: subjectPageInitialState,
    reducers: {
        subjectPageLoaded(state, {payload}: PayloadAction<SubjectPageState>) {
            state.data = payload.data;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            console.log('HYDRATE subjectPage', action.payload);

            return {
                ...state,
                ...action.payload.subjectPage,
            };
        },
    },
});

// Detail page model
interface DetailPageData {
    id: string | null;
    summary: string | null;
    stateTimestamp: number | null;
}

interface DetailPageState {
    data: DetailPageData | null;
}

const detailPageInitialState: DetailPageState = {
    // Different way of doing initial state to show that during client side routing, even though the selector will run with some
    // data, it will not trigger a rerender for the previous page component.
    // You can see that because navigating from and to the /detail/1 page won't trigger the throw new Error(..) line in the component.
    data: {
        id: null,
        summary: null,
        stateTimestamp: null,
    },
};

// Detail page slice approach
const detailPageSlice = createSlice({
    name: 'detailPage',
    initialState: detailPageInitialState,
    reducers: {
        detailPageLoaded(state, {payload}: PayloadAction<DetailPageState>) {
            state.data = payload.data;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            console.log('HYDRATE detailPage', action.payload);

            return {
                ...state,
                ...action.payload.detailPage,
            };
        },
    },
});

interface Pokemon {
    name: string;
}

// API approach
export const pokemonApi = createApi({
    reducerPath: 'pokemonApi',
    baseQuery: fetchBaseQuery({baseUrl: 'https://pokeapi.co/api/v2'}),
    extractRehydrationInfo(action, {reducerPath}) {
        if (action.type === HYDRATE) {
            return action.payload[reducerPath];
        }
    },
    endpoints: builder => ({
        getPokemonByName: builder.query<Pokemon, string>({
            query: name => `/pokemon/${name}`,
        }),
    }),
});

export const {useGetPokemonByNameQuery} = pokemonApi;

// Store setup
const reducers = {
    [subjectPageSlice.name]: subjectPageSlice.reducer,
    [detailPageSlice.name]: detailPageSlice.reducer,
    [pokemonApi.reducerPath]: pokemonApi.reducer,
};

const reducer = combineReducers(reducers);

const makeStore = () =>
    configureStore({
        reducer,
        devTools: true,
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(pokemonApi.middleware),
    });

type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

export const wrapper = createWrapper<AppStore>(makeStore);

// Subject page thunk
export const fetchSubject =
    (id: string): AppThunk =>
    async dispatch => {
        const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

        await timeoutPromise(200);

        dispatch(
            subjectPageSlice.actions.subjectPageLoaded({
                data: {
                    id,
                    name: `Subject ${id}`,
                    stateTimestamp: new Date().getTime(),
                },
            }),
        );
    };

// Detail page thunk
export const fetchDetail =
    (id: string): AppThunk =>
    async dispatch => {
        const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

        await timeoutPromise(200);

        dispatch(
            detailPageSlice.actions.detailPageLoaded({
                data: {
                    id,
                    summary: `This is the summary for the page with id ${id}`,
                    stateTimestamp: new Date().getTime(),
                },
            }),
        );
    };

// Subject page selectors
const subjectPageSliceSelector = (state: AppState): SubjectPageState => state.subjectPage;

const selectSubjectPageData = createSelector(subjectPageSliceSelector, s => s.data);

// The correct way with strict typing on
export const selectSubjectPageId = createSelector(selectSubjectPageData, s => s?.id);
export const selectSubjectPageStateTimestamp = createSelector(selectSubjectPageData, s => s?.stateTimestamp);

// The incorrect way with strict typing off.
// We've added this to show that there will be no null pointer exceptions if a developer doesn't use optional chaining.
// You may expect this to error if a hydration takes place, and this selector's parent dependency becomes null (that is, you get
// null.name, which should throw). But that doesn't happen. Redux doesn't re-run selectors if the parent dependency is dispatched
// to undefined/null.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const selectSubjectPageName = createSelector(selectSubjectPageData, s => s.name);

// Detail page selectors
const detailPageSliceSelector = (state: AppState): DetailPageState => state.detailPage;

export const selectDetailPageData = createSelector(detailPageSliceSelector, s => s.data);

// The correct way with strict typing on
export const selectDetailPageId = createSelector(selectDetailPageData, s => s?.id);
export const selectDetailPageStateTimestamp = createSelector(selectDetailPageData, s => s?.stateTimestamp);

// The incorrect way with strict typing off. See comment above.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const selectDetailPageSummary = createSelector(selectDetailPageData, s => s.summary);