import React from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import Link from 'next/link';
import {NextPage} from 'next';
import {fetchGipp, selectGippPageData, selectGippPageStateTimestamp, selectGippPageTestData, selectSystemSource, wrapper} from '../store';

interface Props {
    name: string;
}

const Page: NextPage<Props> = ({name}) => {
    console.log('State on render', useStore().getState());
    const dispatch = useDispatch();
    const testData = useSelector(selectGippPageTestData);
    const stateTimestamp = useSelector(selectGippPageStateTimestamp);
    const data = useSelector(selectGippPageData);
    const source = useSelector(selectSystemSource);

    console[testData ? 'info' : 'warn']('Rendered testData: ', testData);

    if (!testData || !data) {
        throw new Error('Whoops! We do not have the data and testData selector data!');
    }

    return (
        <>
            <div style={{backgroundColor: 'lavender', padding: '20px'}}>Timestamp in state: {stateTimestamp}</div>
            <div className={`page${1}`}>
                <h1>System source: {source}</h1>
                <h3>{testData}</h3>
                <h3>Page name: {name}</h3>
                <Link href="/subject/1">Go id=1</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/subject/2">Go id=2</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/detail/1">Go to details id=1</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/detail/2">Go to details id=2</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/pokemon/pikachu">Go to Pokemon</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/">Go to homepage</Link>
            </div>
            <button onClick={() => dispatch(fetchGipp())}>Refresh timestamp</button>
        </>
    );
};

Page.getInitialProps = wrapper.getInitialPageProps(store => async () => {
    await store.dispatch(fetchGipp());
    return {name: 'GIPP'};
});

export default Page;
