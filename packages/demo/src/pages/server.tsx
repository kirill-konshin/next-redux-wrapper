import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';
import {wrapper} from '../components/store';

interface OtherProps {
    getServerSideProp: string;
    appProp: string;
}

const Server: NextPage<OtherProps> = ({appProp, getServerSideProp}) => {
    const {app, page} = useSelector<State, State>(state => state);
    return (
        <div className="server">
            <p>Page has access to store even though it does not dispatch anything itself</p>

            <pre>{JSON.stringify({app, page, getServerSideProp, appProp}, null, 2)}</pre>

            <nav>
                <Link href="/">
                    <a>Navigate to index</a>
                </Link>
            </nav>
        </div>
    );
};

export const getServerSideProps = wrapper.getServerSideProps(store => async () => {
    store.dispatch({type: 'PAGE', payload: 'server'});
    return {props: {getServerSideProp: 'bar'}};
});

export default Server;
