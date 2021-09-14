import React from 'react';
import {NextPage} from 'next';
import Link from 'next/link';
import {State} from '../components/reducer';
import {wrapper} from '../components/store';

const PropsPage: NextPage<State> = props => {
    return (
        <div className="pageProps">
            <p>Using Next.js default prop in a wrapped component.</p>
            <pre>{JSON.stringify(props)}</pre>
            <nav>
                <Link href="/">
                    <a>Navigate to index</a>
                </Link>
            </nav>
        </div>
    );
};

PropsPage.getInitialProps = wrapper.getInitialPageProps(store => async () => ({
    prop: 'foo',
}));

export default PropsPage;
