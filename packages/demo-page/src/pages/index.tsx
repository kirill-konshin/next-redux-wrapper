import React from 'react';
import {NextPage} from 'next';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {wrapper} from '../components/store';
import {State} from '../components/reducer';

export interface ConnectedPageProps {
    custom: string;
}

// Page itself is not connected to Redux Store, it has to render Provider to allow child components to connect to Redux Store
const Page: NextPage<ConnectedPageProps> = ({custom}) => {
    const {page} = useSelector<State, State>(state => state);
    return (
        <div className="index">
            <pre>{JSON.stringify({page, custom}, null, 2)}</pre>
            <Link href="/other">
                <a>Navigate</a>
            </Link>
            {' | '}
            <Link href="/error">
                <a>Navigate to error</a>
            </Link>
        </div>
    );
};

export const getServerSideProps = wrapper.getServerSideProps(store => async ({req}) => {
    console.log('2. Page.getServerSideProps uses the store to dispatch things');
    store.dispatch({type: 'PAGE', payload: 'was set in index page ' + req.url});
    await new Promise(res => setTimeout(res, 1000));
    return {props: {custom: 'custom'}};
});

export default Page;
