import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';

const Other: NextPage<any> = ({pathname}) => {
    const {tick, tack, toe} = useSelector<State, State>(state => state);
    return (
        <div className="other">
            <div>Using Next.js default prop in a wrapped component: {pathname}</div>
            <div>{JSON.stringify({tick, tack, toe})}</div>
            <nav>
                <Link href="/">
                    <a>Navigate to index</a>
                </Link>
            </nav>
        </div>
    );
};

export default Other;
