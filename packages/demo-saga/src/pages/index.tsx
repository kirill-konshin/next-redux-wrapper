import React from 'react';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';
import {SAGA_ACTION} from '../components/saga';
import {wrapper} from '../components/store';

export interface ConnectedPageProps {
    custom: string;
}

// Page itself is not connected to Redux Store, it has to render Provider to allow child components to connect to Redux Store
const Page: NextPage<ConnectedPageProps> = ({custom, ...props}: ConnectedPageProps) => {
    wrapper.useHydration(props);
    const {page} = useSelector<State, State>(state => state);
    return (
        <div className="index">
            <pre>{JSON.stringify({page, custom}, null, 2)}</pre>
        </div>
    );
};

Page.getInitialProps = wrapper.getInitialPageProps(store => async () => {
    store.dispatch({type: SAGA_ACTION});
    return {custom: 'custom'};
});

export default Page;
