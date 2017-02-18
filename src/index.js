var React = require('react');
var ReactRedux = require('react-redux');

var connect = ReactRedux.connect;
var Provider = ReactRedux.Provider;

var memoizedStore;
var _Promise;

function initStore(makeStore, isServer, initialState) {

    // Always make a new store if server
    if (isServer && typeof window === 'undefined') {
        return makeStore(initialState);
    }

    // Memoize store if client
    if (!memoizedStore) {
        memoizedStore = makeStore(initialState);
    }

    return memoizedStore;

}

module.exports = function(createStore) {

    var connectArgs = [].slice.call(arguments).slice(1);

    return function(Cmp) {

        // Since provide should always be after connect we connect here
        var ConnectedCmp = (connect.apply(null, connectArgs))(Cmp);

        function WrappedCmp(props) {

            props = props || {};

            var store = props.store;
            var isServer = props.isServer;
            var initialState = props.initialState;
            var initialProps = props.initialProps;

            //console.log('4. WrappedCmp.render created new store with', initialState, 'or picked up existing one', store);
            if (!store || !store.dispatch) {
                store = initStore(createStore, isServer, initialState);
            }

            return React.createElement(
                Provider,
                {store: store},
                React.createElement(ConnectedCmp, initialProps)
            );

        }

        WrappedCmp.getInitialProps = function(dialog) {

            return new _Promise(function(res) {

                dialog = dialog || {};

                // console.log('1. WrappedCmp.getInitialProps wrapper creates the store');

                dialog.isServer = !!dialog.req;
                dialog.store = initStore(createStore, dialog.isServer);

                res(_Promise.all([
                    dialog.isServer,
                    dialog.store,
                    Cmp.getInitialProps ? Cmp.getInitialProps.call(Cmp, dialog) : {}
                ]));

            }).then(function(arr) {

                // console.log('3. WrappedCmp.getInitialProps has store state', store.getState());

                return {
                    store: arr[1],
                    isServer: arr[0],
                    initialState: arr[1].getState(),
                    initialProps: arr[2]
                };

            });

        };

        return WrappedCmp;

    };

};

module.exports.setPromise = function(Promise) {
    _Promise = Promise;
};

module.exports.setPromise(Promise);