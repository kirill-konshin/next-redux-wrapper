import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';

const Error: NextPage = () => {
    const toe = useSelector<State, State['toe']>(state => state.toe);
    return (
        <div>
            <div>This is an error page, it also has access to store: {toe}</div>
            <nav>
                <Link href="/">
                    <a>Navigate to index</a>
                </Link>
            </nav>
        </div>
    );
};

export default Error;
