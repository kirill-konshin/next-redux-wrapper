import React from 'react';
import Link from 'next/link';
import {connect} from 'react-redux';
import {State} from '../components/reducer';

const ErrorPage = ({page}: any) => (
    <>
        <p>This is an error page, {page}.</p>
        <nav>
            <Link href="/">Navigate to index</Link>
        </nav>
    </>
);

export default connect((state: State) => state)(ErrorPage);
