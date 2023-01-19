import React from 'react';
import {NextPage} from 'next';
import Link from 'next/link';
import {State} from '../components/reducer';
import {wrapper} from '../components/store';
import {useSelector} from 'react-redux';

const PropsPage: NextPage<any> = ({prop, appProp, ...props}) => {
    wrapper.useHydration(props);
    const {page, app} = useSelector<State, State>(state => state);

    return (
        <div className="pageProps">
            <p>Using Next.js default prop in a wrapped component.</p>
            <pre>{JSON.stringify({prop, appProp, page, app})}</pre>
            <nav>
                <Link href="/">Navigate to index</Link>
            </nav>
        </div>
    );
};

PropsPage.getInitialProps = wrapper.getInitialPageProps(store => async () => {
    store.dispatch({type: 'PAGE', payload: 'pageProps'});
    return {prop: 'foo'};
});

export default PropsPage;
