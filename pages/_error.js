import React from "react";
import Link from "next/link";
import {connect} from "react-redux";

export default connect(state => state)(({toe}) => (
    <div>
        <div>This is an error page, it also has access to store: {toe}</div>
        <nav>
            <Link href="/"><a>Navigate to index</a></Link>
        </nav>
    </div>
));
