import * as React from 'react';
import renderer from 'react-test-renderer';
import withRedux from './index';
import {AsyncPage, makeStore, SyncPage, verifyComponent, createAppContext} from './testlib';

describe('store integration', () => {
    test('simple', async () => {
        const WrappedPage = withRedux(makeStore)(SyncPage);
        await verifyComponent(WrappedPage);
    });

    test('async', async () => {
        const WrappedPage = withRedux(makeStore)(AsyncPage);
        await verifyComponent(WrappedPage);
    });
});

describe('custom serialization', () => {
    test('custom state serialization on the server and deserialization on the client', async () => {
        class MyApp extends React.Component<any> {
            public render() {
                const {store} = this.props;
                return <div>{JSON.stringify(store.getState())}</div>;
            }
        }

        const WrappedPage = withRedux(makeStore, {
            serializeState: state => ({...state, serialized: true}),
            deserializeState: state => ({...state, deserialized: true}),
            debug: true,
        })(MyApp);

        const props = await WrappedPage.getInitialProps(createAppContext());
        expect(props.initialState.serialized).toBeTruthy();

        const component = renderer.create(<WrappedPage {...props} />);

        const tree = component.toJSON();
        expect(tree).toMatchSnapshot();
    });
});
