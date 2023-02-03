import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';
import {wrapper} from '../components/store';

interface OtherProps {
    getStaticProp: string;
    appProp: string;
}

const Static: NextPage<OtherProps> = ({appProp, getStaticProp, ...props}) => {
    wrapper.useHydration(props);
    const {app, page, promise, promiseApp} = useSelector<State, State>(state => state);
    return (
        <div className="static">
            <p>Page has access to store even though it does not dispatch anything itself</p>

            <pre>{JSON.stringify({app, page, promise, promiseApp, getStaticProp, appProp}, null, 2)}</pre>

            <nav>
                <Link href="/">Navigate to index</Link>
            </nav>
        </div>
    );
};

export const getStaticProps = wrapper.getStaticProps(store => async () => {
    store.dispatch({type: 'PAGE', payload: 'static'});
    await store.dispatch({
        type: 'PROMISE',
        payload: new Promise(res => setTimeout(() => res('bar'), 1)),
    });
    return {props: {getStaticProp: 'bar'}};
});

export default Static;
