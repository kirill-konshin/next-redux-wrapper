import {AppThunk} from '../../index';
import {subjectPageLoaded} from './slice';

export const fetchSubject =
    (id: string): AppThunk =>
    async dispatch => {
        const timeoutPromise = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

        await timeoutPromise(200);

        dispatch(
            subjectPageLoaded({
                data: {
                    id,
                    name: `Subject ${id}`,
                    stateTimestamp: new Date().getTime(),
                },
            }),
        );
    };
