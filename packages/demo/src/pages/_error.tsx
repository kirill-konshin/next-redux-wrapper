import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';

const Error: NextPage = () => {
    const app = useSelector<State, State['app']>(state => state.app);
    return (
        <>
            <p>
                This is an error page, it also has access to store: <code>{app}</code>
            </p>
            <nav>
                <Link href="/">Navigate to index</Link>
            </nav>
        </>
    );
};

export default Error;
