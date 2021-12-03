import React from 'react';
import {NextPage} from 'next';
import Link from 'next/link';
import {useSelector, useDispatch} from 'react-redux';
import {State} from '../components/reducer';
import {wrapper} from '../components/store';

export const getStaticProps = wrapper.getStaticProps(store => async ({previewData}) => {
    console.log('2. Page.getStaticProps uses the store to dispatch things');
    store.dispatch({
        type: 'PAGE',
        payload: 'was set in other page ' + JSON.stringify({previewData}),
    });
    return {props: {}};
});

const OtherPage: NextPage<State> = () => {
    const {page} = useSelector<State, State>(state => state);
    const dispatch = useDispatch();
    const bump = () => dispatch({type: 'BUMP'});
    return (
        <div className="other">
            <p>Using Next.js default prop in a wrapped component.</p>
            <pre>{JSON.stringify({page}, null, 2)}</pre>
            <nav>
                <button onClick={bump}>bump</button>
                <Link href="/">
                    <a>Navigate to index</a>
                </Link>
                <Link href="/other2">
                    <a>Navigate to other 2</a>
                </Link>
            </nav>
        </div>
    );
};

export default OtherPage;
