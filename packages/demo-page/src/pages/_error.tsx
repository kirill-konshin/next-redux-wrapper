import React, {Component} from 'react';
import Link from 'next/link';
import {NextPageContext} from 'next';
import {connect} from 'react-redux';
import {wrapper} from '../components/store';
import {State} from '../components/reducer';

class ErrorPage extends Component<State> {
    public static getInitialProps = ({store, pathname}: NextPageContext) => {
        console.log('2. Page.getInitialProps uses the store to dispatch things');
        store.dispatch({type: 'PAGE', payload: 'was set in error page ' + pathname});
    };

    render() {
        const {page} = this.props;
        return (
            <>
                <p>
                    This is an error page, it also has access to store: <code>{page}</code>
                </p>
                <nav>
                    <Link href="/">
                        <a>Navigate to index</a>
                    </Link>
                </nav>
            </>
        );
    }
}

export default wrapper.withRedux(connect((state: State) => state)(ErrorPage));
