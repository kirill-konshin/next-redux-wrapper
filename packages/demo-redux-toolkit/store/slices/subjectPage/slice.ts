import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {HYDRATE} from 'next-redux-wrapper';
import {SubjectPageState} from './model';

const initialState: SubjectPageState = {
    data: null,
};

export const slice = createSlice({
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

export const {
    actions: {subjectPageLoaded},
    reducer,
} = slice;
