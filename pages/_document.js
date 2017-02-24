import React from "react";
import wrapper from "../src";
import {makeStore} from "../components/store";
import Document, {Head, Main, NextScript} from "next/document";

class MyDocument extends Document {

    static async getInitialProps(ctx) {

        const props = await Document.getInitialProps(ctx);
        const {store, isServer, pathname, query} = ctx;

        console.log(MyDocument.name, '- 2. Cmp.getInitialProps uses the store to dispatch things, pathname', pathname, 'query', query);

        if (isServer) {

            return new Promise((res) => {
                setTimeout(() => {
                    store.dispatch({type: 'TACK', payload: 'server'});
                    res(props);
                }, 200);
            });

        }

        store.dispatch({type: 'TACK', payload: 'client'});

        return props;

    }

    render() {
        return (
            <html>
            <Head>
                <style>{`body { margin: 0 } /* custom! */`}</style>
            </Head>
            <body>
            _document view of Redux tack: {this.props.tack} -- note the difference below
            <Main />
            <NextScript />
            </body>
            </html>
        )
    }
}

MyDocument = wrapper(makeStore, state => state)(MyDocument);

export default MyDocument;