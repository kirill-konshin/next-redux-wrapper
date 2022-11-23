import React from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import Link from 'next/link';
import {InferGetServerSidePropsType, NextPage} from 'next';
import {fetchDetail, selectDetailPageId, selectDetailPageStateTimestamp, selectDetailPageSummary, wrapper} from '../../store';

const Page: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({serverTimestamp}) => {
    console.log('State on render', useStore().getState());
    console.log('Timestamp on server: ', serverTimestamp);
    const dispatch = useDispatch();
    const pageId = useSelector(selectDetailPageId);
    const pageSummary = useSelector(selectDetailPageSummary);
    const stateTimestamp = useSelector(selectDetailPageStateTimestamp);

    console[pageSummary ? 'info' : 'warn']('Rendered pageName: ', pageSummary);

    if (!pageSummary || !pageId) {
        // TODO: Remove below comments
        // If we use the useMemo solution (solution B), then this error will throw if you navigate to a page that triggers a hydrate (e.g. a subject page),
        // and if there is no data reconciliation in the HYDRATE reducer.
        // The reason is useMemo causes the hydration to occur before the new page component is mounted, which means this component is still mounted
        // while the new data is hydrated. That leads to the above selectors resolving to undefined, because the hydrate for the new page
        // puts the slice state back to its initial state (because we don't use data reconciliation).

        // throw new Error('Whoops! pageSummary or pageId are falsy!'); // <-- uncomment this and uncomment the SOLUTION B code in /packages/wrapper/src/index.tsx (and comment out SOLUTION A) to see for yourself
        return (
            <div style={{backgroundColor: 'coral', padding: '20px', height: '500px'}}>
                <br />
                You will never actually see this content, because we use useLayoutEffect to hydrate, which runs before any paints!
            </div>
        );
    }

    // We use prefetch={false} to make sure that only the slice of this page is hydrated, and not other slices.
    // Additionally, when we navigate, we want the freshest data possible, as the GSSP in the pages returns a timestamp of the request time.
    return (
        <>
            <div style={{backgroundColor: 'pink', padding: '20px'}}>Timestamp on server: {serverTimestamp}</div>
            <div style={{backgroundColor: 'lavender', padding: '20px'}}>Timestamp in state: {stateTimestamp}</div>
            <div className={`page${pageId}`}>
                <h3>{pageSummary}</h3>
                <Link href="/subject/1" prefetch={false}>
                    Go id=1
                </Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/subject/2" prefetch={false}>
                    Go id=2
                </Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/detail/1" prefetch={false}>
                    Go to details id=1
                </Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/detail/2" prefetch={false}>
                    Go to details id=2
                </Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/pokemon/pikachu">Go to Pokemon</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/">Go to homepage</Link>
            </div>
            <button onClick={() => dispatch(fetchDetail(pageId))}>Refresh timestamp</button>
        </>
    );
};

export const getServerSideProps = wrapper.getServerSideProps(store => async ({params}) => {
    const id = params?.id;
    if (!id || Array.isArray(id)) {
        throw new Error('Param id must be a string');
    }

    await store.dispatch(fetchDetail(id));

    return {
        props: {
            serverTimestamp: new Date().getTime(),
        },
    };
});

export default Page;
