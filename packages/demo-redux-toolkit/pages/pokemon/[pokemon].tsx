import React from 'react';
import {useRouter} from 'next/router';
import {wrapper, pokemonApi, useGetPokemonByNameQuery} from '../../store';
import {useStore} from 'react-redux';

export default function Pokemon() {
    const {query} = useRouter();

    console.log('State on render', useStore().getState());
    const {data} = useGetPokemonByNameQuery(query.pokemon as string); // data is undefined for the first render

    if (!data) {
        <div style={{backgroundColor: 'coral', padding: '20px', height: '500px'}}>
            <br />
            You will never actually see this content, because we use useLayoutEffect to hydrate, which runs before any paints!
        </div>;
    }

    return <div>Name: {data?.name}</div>;
}

export const getServerSideProps = wrapper.getServerSideProps(store => async context => {
    const pokemon = context.params?.pokemon;
    if (typeof pokemon === 'string') {
        console.log('DISPATCH');
        store.dispatch(pokemonApi.endpoints.getPokemonByName.initiate(pokemon));
    }

    await Promise.all(pokemonApi.util.getRunningOperationPromises());

    console.log('SERVER STATE', store.getState().pokemonApi);

    return {
        props: {},
    };
});
