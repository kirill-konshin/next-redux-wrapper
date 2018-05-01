import React from 'react'
import withRedux from "../lib";
import {makeStore} from "./components/store";

export default withRedux(makeStore, {debug: true})(class MyApp extends React.Component {

    static async getInitialProps({Component, ctx}) {

        // Keep in mind that this will be called twice on server, one for page and second for error page
        await new Promise((res) => {
            setTimeout(() => {
                ctx.store.dispatch({type: 'TOE', payload: 'was set in _app'});
                res();
            }, 200);
        });

        return {
            pageProps: {
                // Call page-level getInitialProps
                ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
                // Some custom thing for all pages
                pathname: ctx.pathname
            }
        };

    }

    render() {
        const {Component, pageProps} = this.props;
        return (
            <Component {...pageProps} />
        );
    }

});