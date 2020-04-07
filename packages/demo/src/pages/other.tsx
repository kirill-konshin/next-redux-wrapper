import React from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {NextPage} from 'next';
import {State} from '../components/reducer';

interface OtherProps {
    getStaticProp: string;
    appProp: string;
}

const Other: NextPage<OtherProps> = ({appProp, getStaticProp}) => {
    const {app, page} = useSelector<State, State>(state => state);
    return (
        <div className="other">
            <p>Page has access to store even though it does not dispatch anything itself</p>

            <pre>{JSON.stringify({app, page, getStaticProp, appProp}, null, 2)}</pre>

            <nav>
                <Link href="/">
                    <a>Navigate to index</a>
                </Link>
            </nav>
        </div>
    );
};

export const getStaticProps = () => ({props: {getStaticProp: 'bar'}});

export default Other;
