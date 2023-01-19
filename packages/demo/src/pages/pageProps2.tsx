import React from 'react';
import {NextPage} from 'next';
import Link from 'next/link';
import {wrapper} from '../components/store';

const PropsPage2: NextPage<any> = ({prop, appProp, ...props}) => {
    wrapper.useHydration(props);
    return (
        <div className="pageProps">
            <p>Using Next.js default prop in a wrapped component.</p>
            <pre>{JSON.stringify({prop, appProp})}</pre>
            <nav>
                <Link href="/">Navigate to index</Link>
            </nav>
        </div>
    );
};

PropsPage2.getInitialProps = () => ({prop: 'bar'});

export default PropsPage2;
