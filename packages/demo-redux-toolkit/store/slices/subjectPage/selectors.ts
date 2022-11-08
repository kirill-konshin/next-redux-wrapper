import {createSelector} from '@reduxjs/toolkit';
import {AppState} from '../../index';
import {SubjectPageState} from './model';

const slice = (state: AppState): SubjectPageState => state.subjectPage;

const selectSubjectPageData = createSelector(slice, s => s.data);

// If your state for a page has nested properties, then you need optional chaining here, otherwise you'll get a null
// pointer exception when you do client side routing to a page whose slice state wasn't present before the routing.
// This happens because the render of the new page occurs before the hydration, as useWrappedStore uses a
// useLayoutEffect. However, this also means that the hydration will occur before the paint, so the user will never
// see UI based on the state data suddenly appear or disappear.
export const selectSubjectPageId = createSelector(selectSubjectPageData, s => s?.id);
export const selectSubjectPageName = createSelector(selectSubjectPageData, s => s?.name);
export const selectSubjectPageStateTimestamp = createSelector(selectSubjectPageData, s => s?.stateTimestamp);
