import {configureStore, createSlice, ThunkAction} from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {Action} from 'redux';
import {createWrapper, HYDRATE} from 'next-redux-wrapper';

// Slice approach
export const subjectSlice = createSlice({
    name: 'subject',

    initialState: {} as any,

    reducers: {
        setEnt(state, action) {
            return action.payload;
        },
    },

    extraReducers: {
        [HYDRATE]: (state, action) => {
            console.log('HYDRATE', action.payload);
            return {
                ...state,
                ...action.payload.subject,
            };
        },
    },
});

export type Pokemon = {
  name: string;
};

// API approach
export const pokemonApi = createApi({
  reducerPath: "pokemonApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://pokeapi.co/api/v2" }),
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === HYDRATE) {
      return action.payload[reducerPath];
    }
  },
  endpoints: (builder) => ({
    getPokemonByName: builder.query<Pokemon, string>({
      query: (name) => `/pokemon/${name}`,
    }),
  }),
});

export const { useGetPokemonByNameQuery } = pokemonApi;

const makeStore = () =>
    configureStore({
        reducer: {
            [subjectSlice.name]: subjectSlice.reducer,
            [pokemonApi.reducerPath]: pokemonApi.reducer,
        },
        devTools: true,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(pokemonApi.middleware),
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

export const fetchSubject =
    (id: any): AppThunk =>
    async dispatch => {
        const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

        await timeoutPromise(200);

        dispatch(
            subjectSlice.actions.setEnt({
                [id]: {
                    id,
                    name: `Subject ${id}`,
                    random: Math.random()
                },
            }),
        );
    };

export const wrapper = createWrapper<AppStore>(makeStore);

export const selectSubject = (id: any) => (state: AppState) => state?.[subjectSlice.name]?.[id];
