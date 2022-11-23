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
            console.log('HYDRATE', action.payload);

            return {
                ...state,
                ...action.payload.subjectPage,
            };
        },
    },
});

// Detail page model
interface DetailPageData {
    id: string;
    summary: string;
    stateTimestamp: number;
}

interface DetailPageState {
    data: DetailPageData | null;
}

const detailPageInitialState: DetailPageState = {
    data: null,
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
            console.log('HYDRATE', action.payload);

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

// If your state for a page has nested properties, then you need optional chaining here, otherwise you'll get a null
// pointer exception when you do client side routing to a page whose slice state wasn't present before the routing.
// This happens because the render of the new page occurs before the hydration, as useWrappedStore uses a
// useLayoutEffect. However, this also means that the hydration will occur before the paint, so the user will never
// see UI based on the state data suddenly appear or disappear.
export const selectSubjectPageId = createSelector(selectSubjectPageData, s => s?.id);
export const selectSubjectPageName = createSelector(selectSubjectPageData, s => s?.name);
export const selectSubjectPageStateTimestamp = createSelector(selectSubjectPageData, s => s?.stateTimestamp);

// Detail page selectors
const detailPageSliceSelector = (state: AppState): DetailPageState => state.detailPage;

const selectDetailPageData = createSelector(detailPageSliceSelector, s => s.data);

export const selectDetailPageId = createSelector(selectDetailPageData, s => s?.id);
export const selectDetailPageSummary = createSelector(selectDetailPageData, s => s?.summary);
export const selectDetailPageStateTimestamp = createSelector(selectDetailPageData, s => s?.stateTimestamp);
