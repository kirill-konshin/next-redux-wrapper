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
        throw new Error('Whoops! We do not have the pageId and pageName selector data!');
    }

    return (
        <>
            <div style={{backgroundColor: 'pink', padding: '20px'}}>Timestamp on server: {serverTimestamp}</div>
            <div style={{backgroundColor: 'lavender', padding: '20px'}}>Timestamp in state: {stateTimestamp}</div>
            <div className={`page${pageId}`}>
                <h3>{pageName}</h3>
                <Link href="/subject/1">Go id=1</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/subject/2">Go id=2</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/detail/1">Go to details id=1</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/detail/2">Go to details id=2</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/gipp">Go to gipp page</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/pokemon/pikachu">Go to Pokemon</Link>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Link href="/">Go to homepage</Link>
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

    return {
        props: {
            serverTimestamp: new Date().getTime(),
        },
    };
});

export default Page;
