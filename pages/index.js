import React from "react";
import Link from "next/link";
import wrapper from "../src";
import {makeStore} from "../components/store";

class Page extends React.Component {

    static getInitialProps({store, isServer, pathname, query}) {

        console.log(Page.name, '- 2. Cmp.getInitialProps uses the store to dispatch things, pathname', pathname, 'query', query);

        // If it's a server, then all async actions must be done before return or return a promise
        if (isServer) {

            return new Promise((res) => {
                setTimeout(() => {
                    store.dispatch({type: 'TICK', payload: 'server'});
                    res({custom: 'custom server'});
                }, 200);
            });

        }

        // If it's a client, then it does not matter because client can be progressively rendered
        store.dispatch({type: 'TICK', payload: 'client'});

        return {custom: 'custom client'};

    }

    render() {
        // console.log('5. Page.render');
        return (
            <div>
                <div>Redux tick: {this.props.tick} (this page)</div>
                <div>Custom: {this.props.custom}</div>
                <Link href="/other"><a>Navigate</a></Link>
            </div>

        )
    }

}

wrapper.setDebug(true);

Page = wrapper(makeStore, state => state)(Page);

export default Page;