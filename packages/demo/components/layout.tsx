import React, {FunctionComponent} from 'react';
import {connect} from 'react-redux';

const Layout: FunctionComponent<any> = ({tick, toe, children}) => (
    <div className="layout">
        <div>Redux tick: {tick}</div>
        <div>Redux toe: {toe}</div>
        {children}
    </div>
);

export default connect(state => state)(Layout);
