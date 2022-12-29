import React from 'react';
import {NextPage} from 'next';
import Link from 'next/link';

const PropsPage2: NextPage = props => {
    return (
        <div className="pageProps">
            <p>Using Next.js default prop in a wrapped component.</p>
            <pre>{JSON.stringify(props)}</pre>
            <nav>
                <Link href="/">Navigate to index</Link>
            </nav>
        </div>
    );
};

PropsPage2.getInitialProps = () => ({
    prop: 'bar',
});

export default PropsPage2;
