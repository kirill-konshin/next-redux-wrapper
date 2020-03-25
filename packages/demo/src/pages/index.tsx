import React from 'react';
import Link from 'next/link';
import {connect} from 'react-redux';
import {NextPageContext} from 'next';
import {State} from '../components/reducer';

export interface PageProps extends State {
    custom: string;
}

class Index extends React.Component<PageProps> {
    // note that since _app is wrapped no need to wrap page
    public static async getInitialProps({store, isServer, pathname, query, req}: NextPageContext<State>) {
        console.log('2. Page.getInitialProps uses the store to dispatch things', {pathname, query, isServer});

        if (isServer) {
            // All async actions must be await'ed
            await store.dispatch({type: 'PAGE', payload: 'server'});

            // Some custom thing for this particular page
            return {custom: 'server'};
        }

        // await is not needed if action is synchronous
        store.dispatch({type: 'PAGE', payload: 'client'});

        // Some custom thing for this particular page
        return {custom: 'client'};
    }

    public render() {
        // console.log('5. Page.render');
        const {custom, app, page} = this.props;
        return (
            <div className="index">
                <p>
                    Try to navigate to another page and return back here to see how <code>getInitialProps</code> will be
                    used on client side.
                </p>

                <pre>{JSON.stringify({custom, app, page}, null, 2)}</pre>

                <Link href="/other">
                    <a>Navigate</a>
                </Link>
                {' | '}
                <Link href="/error">
                    <a>Navigate to error</a>
                </Link>
            </div>
        );
    }
}

export default connect(state => state)(Index);
