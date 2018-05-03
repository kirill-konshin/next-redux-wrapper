import React from "react";
import {connect} from "react-redux";

const Layout = ({tick, children}) => (
    <div className="layout">
        <div>Redux tick: {tick}</div>
        {children}
    </div>
);

export default connect(state => state)(Layout);