import React from 'react';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';
import {SAGA_ACTION} from '../components/saga';
import {SagaStore, wrapper} from '../components/store';
import {END} from '@redux-saga/core';

export interface ConnectedPageProps {
    custom: string;
}

// Page itself is not connected to Redux Store, it has to render Provider to allow child components to connect to Redux Store
const Page: NextPage<ConnectedPageProps> = ({custom}: ConnectedPageProps) => {
    const {page} = useSelector<State, State>(state => state);
    return (
        <div className="index">
            <pre>{JSON.stringify({page, custom}, null, 2)}</pre>
        </div>
    );
};

Page.getInitialProps = wrapper.getInitialPageProps(store => async ctx => {
    store.dispatch({type: SAGA_ACTION});

    // Stop the saga if on server
    if (ctx.req) {
        console.log('Saga is executing on server, we will wait');
        store.dispatch(END);
        await (store as SagaStore).sagaTask.toPromise();
    }

    return {custom: 'custom'};
});

export default Page;
