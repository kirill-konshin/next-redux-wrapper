import Link from "next/link";
import React from "react";
import {makeStore} from "../components/store";
import wrapper from "../src";

export default wrapper(makeStore)(() => (
    <div>
        <nav>
            <Link href="/"><a>Navigate to index</a></Link>
        </nav>
    </div>
));
