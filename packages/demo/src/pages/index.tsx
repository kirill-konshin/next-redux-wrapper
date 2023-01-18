import React from 'react';
import Link from 'next/link';
import {connect} from 'react-redux';
import {State} from '../components/reducer';
import {wrapper} from "../components/store";

export interface PageProps extends State {
    pageProp: string;
    appProp: string;
}

class Index extends React.Component<PageProps> {
    // note that since _app is wrapped no need to wrap page
    public static getInitialProps = wrapper.getInitialPageProps(store => async ({pathname, query, req}) => {
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

    public render() {
        // console.log('5. Page.render');
        const {pageProp, appProp, app, page} = this.props;
        return (
            <div className="index">
                <p>
                    Try to navigate to another page and return back here to see how <code>getInitialProps</code> will be used on client
                    side.
                </p>

                <pre>{JSON.stringify({pageProp, appProp, app, page}, null, 2)}</pre>

                <Link href="/server">Navigate</Link>
                {' | '}
                <Link href="/pageProps">Navigate to pageProps</Link>
                {' | '}
                <Link href="/pageProps2">Navigate to pageProps2</Link>
                {' | '}
                <Link href="/static">Navigate to static</Link>
                {' | '}
                <Link href="/error">Navigate to error</Link>
            </div>
        );
    }
}

export default connect(state => state)(wrapper.withHydration(Index));
