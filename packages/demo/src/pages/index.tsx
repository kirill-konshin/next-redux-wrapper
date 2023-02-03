import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {State} from '../components/reducer';
import {wrapper} from '../components/store';
import {NextPage} from 'next';

export interface PageProps extends State {
    pageProp: string;
    appProp: string;
}

const Page: NextPage<PageProps> = function ({pageProp, appProp, ...props}) {
    wrapper.useHydration(props);
    const {app, page, promise, promiseApp} = useSelector<State, State>(state => state);
    return (
        <div className="index">
            <p>
                Try to navigate to another page and return back here to see how <code>getInitialProps</code> will be used on client side.
            </p>

            <pre>{JSON.stringify({pageProp, appProp, app, page, promise, promiseApp}, null, 2)}</pre>

            <Link href="/server">Navigate</Link>
            {' | '}
            <Link href="/pageProps">Navigate to pageProps</Link>
            {' | '}
            <Link href="/pageProps2">Navigate to pageProps2</Link>
            {' | '}
            <Link href="/server">Navigate to server</Link>
            {' | '}
            <Link href="/static">Navigate to static</Link>
            {' | '}
            <Link href="/error">Navigate to error</Link>
        </div>
    );
};

(Page as any).getInitialProps = wrapper.getInitialPageProps(store => async ({pathname, query, req}) => {
    console.log('2. Page.getInitialProps uses the store to dispatch things', {
        pathname,
        query,
    });

    if (req) {
        // All async actions must be awaited
        await store.dispatch({type: 'PAGE', payload: 'server'});

        // Some custom thing for this particular page
        return {pageProp: 'server'};
    }

    // await is not needed if action is synchronous
    store.dispatch({type: 'PAGE', payload: 'client'});

    // Some custom thing for this particular page
    return {pageProp: 'client'};
});

export default Page;
