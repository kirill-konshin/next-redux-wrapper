import React from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import Link from 'next/link';
import {InferGetServerSidePropsType, NextPage} from 'next';
import {fetchSubject, selectSubjectPageId, selectSubjectPageName, selectSubjectPageStateTimestamp, wrapper} from '../../store';

const Page: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({serverTimestamp}) => {
    console.log('State on render', useStore().getState());
    console.log('Timestamp on server: ', serverTimestamp);
    const dispatch = useDispatch();
    const pageId = useSelector(selectSubjectPageId);
    const pageName = useSelector(selectSubjectPageName);
    const stateTimestamp = useSelector(selectSubjectPageStateTimestamp);

    console[pageName ? 'info' : 'warn']('Rendered pageName: ', pageName);

    if (!pageName || !pageId) {
        // On client side routing from the homepage to this route, the selectors will be undefined because of the
        // optional chaining. Check out the selectors.
        return (
            <div style={{backgroundColor: 'coral', padding: '20px', height: '500px'}}>
                <br />
                You will never actually see this content, because we use useLayoutEffect to hydrate, which runs before any paints!
            </div>
        );
    }

    return (
        <>
            <div style={{backgroundColor: 'pink', padding: '20px'}}>Timestamp on server: {serverTimestamp}</div>
            <div style={{backgroundColor: 'lavender', padding: '20px'}}>Timestamp in state: {stateTimestamp}</div>
            <div className={`page${pageId}`}>
                <h3>{pageName}</h3>
                <Link href="/subject/1">
                    <a>Go id=1</a>
                </Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/subject/2">
                    <a>Go id=2</a>
                </Link>
            </div>
            <button onClick={() => dispatch(fetchSubject(pageId))}>Refresh timestamp</button>
        </>
    );
};

export const getServerSideProps = wrapper.getServerSideProps(store => async ({params}) => {
    const id = params?.id;
    if (!id || Array.isArray(id)) {
        throw new Error('Param id must be a string');
    }

    await store.dispatch(fetchSubject(id));

    console.log('State on server', store.getState());

    return {
        props: {
            serverTimestamp: new Date().getTime(),
        },
    };
});

export default Page;
