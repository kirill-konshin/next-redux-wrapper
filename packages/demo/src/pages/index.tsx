import React from 'react';
import Link from 'next/link';
import {connect} from 'react-redux';
import {NextPageContext} from 'next';
import {State} from '../components/reducer';

export interface PageProps {
    custom: string;
}

class Page extends React.Component<PageProps> {
    public static getInitialProps({store, isServer, pathname, query}: NextPageContext<State>) {
        console.log('2. Page.getInitialProps uses the store to dispatch things, pathname', pathname, 'query', query);

        // All async actions must be await'ed before return or return a promise
        if (isServer) {
            return new Promise(res => {
                setTimeout(() => {
                    store.dispatch({type: 'TICK', payload: 'server'});
                    res({custom: 'custom server'});
                }, 200);
            });
        }

        store.dispatch({type: 'TICK', payload: 'client'});

        // Some custom thing for this particular page
        return {custom: 'custom client'};
    }

    public render() {
        // console.log('5. Page.render');
        const {custom} = this.props;
        return (
            <div className="index">
                <div>Custom: {custom}</div>
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

export default connect(state => state)(Page);
