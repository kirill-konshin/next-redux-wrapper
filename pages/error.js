import Link from "next/link";
import React from "react";
import {makeStore} from "../components/store";
import wrapper from "../src";

const Foo = wrapper(makeStore)(() => (<div>Foo</div>));

export default wrapper(makeStore)(() => (
    <div>
        <div>This component makes an error, this is normal.</div>
        <Foo/>
        <nav>
            <Link href="/"><a>Navigate to index</a></Link>
        </nav>
    </div>
));
