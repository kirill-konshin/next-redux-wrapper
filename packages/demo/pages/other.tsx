import React from 'react';
import Link from 'next/link';
import {connect} from 'react-redux';

export default connect(state => state)(({pathname}) => (
    <div className="other">
        <div>Using Next.js default prop in a wrapped component: {pathname}</div>
        <nav>
            <Link href="/">
                <a>Navigate to index</a>
            </Link>
        </nav>
    </div>
));
