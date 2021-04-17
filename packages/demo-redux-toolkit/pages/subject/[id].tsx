import React from 'react';
import {useSelector, useStore} from 'react-redux';
import Link from 'next/link';
import {fetchSubject, selectSubject, wrapper} from '../../store';

const Page = props => {
    console.log('State on render', useStore().getState(), {props});
    const content = useSelector(selectSubject(props.id));

    console[content ? 'info' : 'warn']('Rendered content: ', content);

    if (!content) {
        return <div>RENDERED WITHOUT CONTENT FROM STORE!!!???</div>;
    }

    return (
        <div>
            <h3>{content.name}</h3>
            <Link href="/subject/1">
                <a>Subject id 1</a>
            </Link>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <Link href="/subject/2">
                <a>Subject id 2</a>
            </Link>
        </div>
    );
};

export const getServerSideProps = wrapper.getServerSideProps(store => async ({params}) => {
    const {id} = params;

    await store.dispatch(fetchSubject(id));

    console.log('State on server', store.getState());

    return {
        props: {
            id,
        },
    };
});

export default Page;
